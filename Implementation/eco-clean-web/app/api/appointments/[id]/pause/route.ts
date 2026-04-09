export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

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

    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staffId = session.user.id;

    if (!staffId) {
      return NextResponse.json(
        { error: "staffId is required" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, status: true },
      });

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      if (appointment.status === "COMPLETED") {
        throw new Error("Completed appointment cannot be paused");
      }

      if (appointment.status === "CANCELLED") {
        throw new Error("Cancelled appointment cannot be paused");
      }

      const activeSession = await tx.appointmentWorkSession.findFirst({
        where: {
          appointmentId,
          staffId,
          endedAt: null,
        },
        orderBy: {
          startedAt: "desc",
        },
      });

      if (!activeSession) {
        throw new Error("No active session to pause");
      }

      await tx.appointmentWorkSession.update({
        where: { id: activeSession.id },
        data: { endedAt: new Date() },
      });

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
      error instanceof Error ? error.message : "Failed to pause appointment";

    return NextResponse.json(
      { error: message },
      {
        status: message === "Appointment not found" ? 404 : 400,
      },
    );
  }
}
