export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Body = {
  itemId?: string;
  completed?: boolean;
};

function canStaffToggleChecklist(
  staffId: string,
  assignments: Array<{ staffId: string; isTeamLead: boolean }>,
) {
  const isAssigned = assignments.some((assignment) => assignment.staffId === staffId);
  if (!isAssigned) return false;

  if (assignments.length === 1) {
    return assignments[0].staffId === staffId;
  }

  return assignments.some(
    (assignment) => assignment.staffId === staffId && assignment.isTeamLead,
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session || (session.user.role !== "STAFF" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: appointmentId } = await params;
  const body = (await req.json().catch(() => null)) as Body | null;
  const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : "";

  if (!appointmentId || !itemId || typeof body?.completed !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      assignments: {
        select: {
          staffId: true,
          isTeamLead: true,
        },
      },
      checklistItems: {
        where: { id: itemId },
        select: { id: true },
      },
    },
  });

  if (!appointment || appointment.checklistItems.length === 0) {
    return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
  }

  if (
    session.user.role === "STAFF" &&
    !canStaffToggleChecklist(session.user.id, appointment.assignments)
  ) {
    return NextResponse.json(
      { error: "Only the team lead or sole participant can update the checklist" },
      { status: 403 },
    );
  }

  const updatedAppointment = await prisma.$transaction(async (tx) => {
    await tx.appointmentChecklistItem.update({
      where: { id: itemId },
      data: body.completed
        ? {
            isCompleted: true,
            completedAt: new Date(),
            completedById: session.user.id,
          }
        : {
            isCompleted: false,
            completedAt: null,
            completedById: null,
          },
    });

    return tx.appointment.findUnique({
      where: { id: appointmentId },
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
  });

  return NextResponse.json({
    ...updatedAppointment,
    appointmentAiInsight: updatedAppointment?.appointmentAiInsights[0] ?? null,
    staff: updatedAppointment?.assignments.map((assignment) => assignment.staff) ?? [],
  });
}
