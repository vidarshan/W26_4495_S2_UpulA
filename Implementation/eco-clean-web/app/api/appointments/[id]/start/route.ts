export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { normalizeAddressLocation } from "@/lib/staffLocation";
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type StartAppointmentBody = {
  staffId?: string;
};

function parseBody(raw: string): StartAppointmentBody {
  if (!raw) return {};

  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed === "string") {
    return JSON.parse(parsed) as StartAppointmentBody;
  }

  return (parsed ?? {}) as StartAppointmentBody;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: appointmentId } = await params;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Missing appointment id" },
        { status: 400 },
      );
    }

    let body: StartAppointmentBody = {};
    try {
      const raw = await req.text();
      body = parseBody(raw);
    } catch {
      body = {};
    }

    const staffId =
      typeof body.staffId === "string" && body.staffId.trim().length > 0
        ? body.staffId.trim()
        : undefined;

    if (!staffId) {
      return NextResponse.json(
        { error: "staffId is required" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          workSessions: {
            where: { endedAt: null },
          },
          job: {
            select: {
              address: {
                select: {
                  street1: true,
                  street2: true,
                  city: true,
                  province: true,
                  postalCode: true,
                  country: true,
                },
              },
            },
          },
          assignments: {
            select: {
              staffId: true,
            },
          },
        },
      });

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      if (appointment.status === "COMPLETED") {
        throw new Error("Completed appointment cannot be started");
      }

      if (appointment.status === "CANCELLED") {
        throw new Error("Cancelled appointment cannot be started");
      }
      const myActiveSession = appointment.workSessions.find(
        (session) => session.staffId === staffId,
      );

      if (myActiveSession) {
        throw new Error(
          "You already have an active session for this appointment",
        );
      }

      if (staffId) {
        const staffUser = await tx.user.findUnique({
          where: { id: staffId },
          select: { id: true, role: true },
        });

        if (!staffUser || staffUser.role !== Role.STAFF) {
          throw new Error("Invalid staffId");
        }

        const assignedStaffIds = new Set(
          appointment.assignments.map((a) => a.staffId),
        );

        if (!assignedStaffIds.has(staffId)) {
          throw new Error("Staff member is not assigned to this appointment");
        }
      }

      await tx.appointmentWorkSession.create({
        data: {
          appointmentId,
          staffId,
          startedAt: new Date(),
        },
      });

      const jobLocation = normalizeAddressLocation(appointment.job.address);

      if (jobLocation) {
        await tx.user.update({
          where: { id: staffId },
          data: {
            lastKnownJobLocation: jobLocation,
          },
        });
      }

      const fullAppointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
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
          assignments: {
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
            orderBy: { createdAt: "asc" },
          },
          notes: true,
          images: true,
          job: {
            include: {
              client: true,
              address: true,
            },
          },
        },
      });

      return fullAppointment;
    });

    return NextResponse.json({
      ...result,
      staff: result?.assignments.map((a) => a.staff) ?? [],
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to start appointment";

    return NextResponse.json(
      { error: message },
      {
        status: message === "Appointment not found" ? 404 : 400,
      },
    );
  }
}
