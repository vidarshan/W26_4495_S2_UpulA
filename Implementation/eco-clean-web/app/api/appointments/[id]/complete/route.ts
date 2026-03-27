export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { normalizeAddressLocation } from "@/lib/staffLocation";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
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

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          status: true,
          assignments: {
            select: {
              staffId: true,
              staff: {
                select: {
                  staffProfile: {
                    select: {
                      staffAddress: {
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
                },
              },
            },
          },
        },
      });

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new Error("Cancelled appointment cannot be completed");
      }

      if (appointment.status === AppointmentStatus.COMPLETED) {
        throw new Error("Appointment is already completed");
      }

      const activeSession = await tx.appointmentWorkSession.findFirst({
        where: {
          appointmentId,
          endedAt: null,
        },
        orderBy: {
          startedAt: "desc",
        },
      });

      if (activeSession) {
        await tx.appointmentWorkSession.update({
          where: { id: activeSession.id },
          data: { endedAt: new Date() },
        });
      }

      const allSessions = await tx.appointmentWorkSession.findMany({
        where: { appointmentId },
      });

      const totalSeconds = allSessions.reduce((sum, s) => {
        if (!s.endedAt) return sum;

        const diff = Math.max(
          0,
          Math.floor((s.endedAt.getTime() - s.startedAt.getTime()) / 1000),
        );

        return sum + diff;
      }, 0);

      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.COMPLETED,
          completedAt: new Date(),
          timeSpent: Math.floor(totalSeconds / 60),
        },
      });

      for (const assignment of appointment.assignments) {
        const homeLocation = normalizeAddressLocation(
          assignment.staff.staffProfile?.staffAddress,
        );

        await tx.user.update({
          where: { id: assignment.staffId },
          data: {
            lastKnownJobLocation: homeLocation ?? Prisma.DbNull,
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
      error instanceof Error ? error.message : "Failed to complete appointment";

    return NextResponse.json(
      { error: message },
      {
        status: message === "Appointment not found" ? 404 : 400,
      },
    );
  }
}
