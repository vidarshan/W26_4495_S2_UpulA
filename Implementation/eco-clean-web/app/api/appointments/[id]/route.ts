export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { AppointmentStatus, Prisma, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { parseAppDateTimeInput } from "@/lib/dateTime";
import { UTApi } from "uploadthing/server";
import { getAuthSession } from "@/lib/session";
import {
  normalizeChecklistInput,
  normalizeLeadStaffId,
} from "@/lib/appointments/checklist";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
const utapi = new UTApi();

type PatchBody = {
  startTime?: string;
  endTime?: string;
  status?: AppointmentStatus;
  staffIds?: string[];
  leadStaffId?: string | null;
  checklist?: Array<{ id?: string; label: string }>;
  note?: string | null;
  noteIsClientVisible?: boolean;
};

const VALID_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "LATE",
];

function parseJsonBody(raw: string): PatchBody | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") {
      return JSON.parse(parsed) as PatchBody;
    }
    return parsed as PatchBody;
  } catch {
    return null;
  }
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.filter((v) => typeof v === "string" && v.trim()))];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            isClientVisible: true,
            images: true,
          },
        },
        images: true,
        workSessions: {
          orderBy: { startedAt: "asc" },
          include: {
            staff: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        appointmentAiInsights: {
          where: { type: "task_assistant.plan" },
          take: 1,
          orderBy: { updatedAt: "desc" },
        },
        checklistItems: {
          orderBy: { sortOrder: "asc" },
        },
        job: {
          include: {
            client: true,
            address: true,
            lineItems: true,
            recurrence: true,
            notes: {
              include: {
                images: true,
                createdBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
              orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
            },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...appointment,
      appointmentAiInsight: appointment.appointmentAiInsights[0] ?? null,
      staff: appointment.assignments.map((a) => a.staff), // optional compatibility shape
    });
  } catch (err) {
    console.error("GET appointment by ID error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const raw = await req.text();
  const body = parseJsonBody(raw);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    startTime,
    endTime,
    status,
    staffIds,
    leadStaffId,
    checklist,
    note,
    noteIsClientVisible,
  } = body;
  const normalizedChecklist =
    checklist !== undefined ? normalizeChecklistInput(checklist) : undefined;

  if ((startTime && !endTime) || (!startTime && endTime)) {
    return NextResponse.json(
      { error: "Provide both startTime and endTime together" },
      { status: 400 },
    );
  }

  if (status && !VALID_APPOINTMENT_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (staffIds !== undefined && !Array.isArray(staffIds)) {
    return NextResponse.json(
      { error: "staffIds must be an array" },
      { status: 400 },
    );
  }

  if (
    noteIsClientVisible !== undefined &&
    typeof noteIsClientVisible !== "boolean"
  ) {
    return NextResponse.json(
      { error: "noteIsClientVisible must be a boolean" },
      { status: 400 },
    );
  }

  const appointmentData: Prisma.AppointmentUpdateInput = {};
  let parsedStartTime: Date | null = null;
  let parsedEndTime: Date | null = null;

  if (startTime && endTime) {
    parsedStartTime = parseAppDateTimeInput(startTime);
    parsedEndTime = parseAppDateTimeInput(endTime);

    if (!parsedStartTime || !parsedEndTime) {
      return NextResponse.json(
        { error: "Invalid startTime/endTime" },
        { status: 400 },
      );
    }

    if (parsedEndTime <= parsedStartTime) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 },
      );
    }

    appointmentData.startTime = parsedStartTime;
    appointmentData.endTime = parsedEndTime;
  }

  if (status) {
    appointmentData.status = status;
  }

  try {
    const updated = await prisma.$transaction(async (tx: Tx) => {
      const existingAppointment = await tx.appointment.findUnique({
        where: { id },
        select: {
          id: true,
          assignments: {
            select: {
              staffId: true,
            },
          },
          checklistItems: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!existingAppointment) {
        throw new Error("Appointment not found");
      }

      // 1) Update appointment core fields
      if (Object.keys(appointmentData).length > 0) {
        await tx.appointment.update({
          where: { id },
          data: appointmentData,
        });
      }

      // 2) Sync staff assignments
      if (Array.isArray(staffIds)) {
        const normalizedStaffIds = dedupeStrings(staffIds);

        if (normalizedStaffIds.length > 0) {
          const validStaff = await tx.user.findMany({
            where: {
              id: { in: normalizedStaffIds },
              role: Role.STAFF,
            },
            select: { id: true },
          });

          const validStaffIds = validStaff.map((u) => u.id);

          if (validStaffIds.length !== normalizedStaffIds.length) {
            return NextResponse.json(
              { error: "One or more staffIds are invalid" },
              { status: 400 },
            );
          }

          await tx.assignment.deleteMany({
            where: {
              appointmentId: id,
              staffId: { notIn: validStaffIds },
            },
          });

          const existingAssignments = await tx.assignment.findMany({
            where: { appointmentId: id },
            select: { staffId: true },
          });

          const existingStaffIds = new Set(
            existingAssignments.map((a) => a.staffId),
          );

          const toCreate = validStaffIds.filter(
            (staffId) => !existingStaffIds.has(staffId),
          );

          if (toCreate.length > 0) {
            await tx.assignment.createMany({
              data: toCreate.map((staffId) => ({
                appointmentId: id,
                staffId,
                isTeamLead: false,
                ...(parsedStartTime ? { plannedStart: parsedStartTime } : {}),
                ...(parsedEndTime ? { plannedEnd: parsedEndTime } : {}),
              })),
            });
          }

          if (parsedStartTime && parsedEndTime) {
            await tx.assignment.updateMany({
              where: { appointmentId: id },
              data: {
                plannedStart: parsedStartTime,
                plannedEnd: parsedEndTime,
              },
            });
          }

          const effectiveLeadStaffId = normalizeLeadStaffId(
            leadStaffId,
            validStaffIds,
          );

          await tx.assignment.updateMany({
            where: { appointmentId: id },
            data: { isTeamLead: false },
          });

          if (effectiveLeadStaffId) {
            await tx.assignment.updateMany({
              where: {
                appointmentId: id,
                staffId: effectiveLeadStaffId,
              },
              data: { isTeamLead: true },
            });
          }
        } else {
          await tx.assignment.deleteMany({
            where: { appointmentId: id },
          });
        }
      } else if (leadStaffId !== undefined) {
        const existingStaffIds = existingAppointment.assignments.map(
          (assignment) => assignment.staffId,
        );
        const effectiveLeadStaffId = normalizeLeadStaffId(
          leadStaffId,
          existingStaffIds,
        );

        await tx.assignment.updateMany({
          where: { appointmentId: id },
          data: { isTeamLead: false },
        });

        if (effectiveLeadStaffId) {
          await tx.assignment.updateMany({
            where: {
              appointmentId: id,
              staffId: effectiveLeadStaffId,
            },
            data: { isTeamLead: true },
          });
        }
      }

      if (parsedStartTime && parsedEndTime && !Array.isArray(staffIds)) {
        await tx.assignment.updateMany({
          where: { appointmentId: id },
          data: {
            plannedStart: parsedStartTime,
            plannedEnd: parsedEndTime,
          },
        });
      }

      // 3) Sync checklist items
      if (normalizedChecklist !== undefined) {
        const existingIds = new Set(
          existingAppointment.checklistItems.map((item) => item.id),
        );
        const keepIds = new Set(
          normalizedChecklist
            .map((item) => item.id)
            .filter((itemId): itemId is string => !!itemId),
        );

        const deleteIds = [...existingIds].filter((itemId) => !keepIds.has(itemId));

        if (deleteIds.length > 0) {
          await tx.appointmentChecklistItem.deleteMany({
            where: {
              appointmentId: id,
              id: { in: deleteIds },
            },
          });
        }

        for (const item of normalizedChecklist) {
          if (item.id && existingIds.has(item.id)) {
            await tx.appointmentChecklistItem.update({
              where: { id: item.id },
              data: {
                label: item.label,
                sortOrder: item.sortOrder,
              },
            });
          } else {
            await tx.appointmentChecklistItem.create({
              data: {
                appointmentId: id,
                label: item.label,
                sortOrder: item.sortOrder,
              },
            });
          }
        }
      }

      // 4) Handle note updates
      if (note !== undefined) {
        const trimmed = typeof note === "string" ? note.trim() : "";

        const existing = await tx.visitNote.findFirst({
          where: { appointmentId: id, isClientVisible: false },
          orderBy: { createdAt: "desc" },
        });

        if (!trimmed) {
          if (existing) {
            await tx.visitNote.delete({ where: { id: existing.id } });
          }
        } else {
          if (existing) {
            await tx.visitNote.update({
              where: { id: existing.id },
              data: {
                content: trimmed,
                ...(typeof noteIsClientVisible === "boolean"
                  ? { isClientVisible: noteIsClientVisible }
                  : {}),
              },
            });
          } else {
            await tx.visitNote.create({
              data: {
                appointmentId: id,
                content: trimmed,
                isClientVisible:
                  typeof noteIsClientVisible === "boolean"
                    ? noteIsClientVisible
                    : false,
              },
            });
          }
        }
      }

      // 5) Return fresh data
      return tx.appointment.findUnique({
        where: { id },
        include: {
          assignments: {
            include: {
              staff: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          job: {
            include: {
              client: true,
              address: true,
              lineItems: true,
              recurrence: true,
              notes: {
                include: {
                  images: true,
                  createdBy: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true,
                    },
                  },
                },
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
              },
            },
          },
          notes: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              createdAt: true,
              isClientVisible: true,
              images: true,
            },
          },
          images: true,
          workSessions: {
            orderBy: { startedAt: "asc" },
            include: {
              staff: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
          checklistItems: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    });

    if (updated instanceof NextResponse) {
      return updated;
    }

    return NextResponse.json({
      ...updated,
      staff: updated?.assignments.map((a) => a.staff) ?? [],
    });
  } catch (err) {
    console.error("Failed to update appointment:", err);

    if (err instanceof Error && err.message === "Appointment not found") {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        images: {
          select: {
            fileKey: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    const fileKeys = appointment.images
      .map((image) => image.fileKey)
      .filter((fileKey): fileKey is string => !!fileKey);

    if (fileKeys.length > 0) {
      await utapi.deleteFiles(fileKeys);
    }

    await prisma.appointment.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete appointment:", err);
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 },
    );
  }
}
