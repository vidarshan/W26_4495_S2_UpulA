export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: appointmentId } = await params;

    let body: any = {};
    try {
      const raw = await req.text();
      body = raw ? JSON.parse(raw) : {};
      if (typeof body === "string") body = JSON.parse(body);
    } catch {
      body = {};
    }

    const staffId =
      typeof body.staffId === "string" && body.staffId.trim()
        ? body.staffId.trim()
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          workSessions: {
            where: { endedAt: null },
          },
        },
      });

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      if (appointment.status === "COMPLETED") {
        throw new Error("Completed appointment cannot be started");
      }

      if (appointment.workSessions.length > 0) {
        throw new Error("Appointment is already running");
      }

      await tx.appointmentWorkSession.create({
        data: {
          appointmentId,
          staffId,
          startedAt: new Date(),
        },
      });

      return tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          workSessions: { orderBy: { startedAt: "asc" } },
          staff: true,
          notes: true,
          images: true,
          job: { include: { client: true, address: true } },
        },
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to start appointment" },
      { status: 400 },
    );
  }
}
