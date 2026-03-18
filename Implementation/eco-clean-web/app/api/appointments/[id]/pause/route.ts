export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: appointmentId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const activeSession = await tx.appointmentWorkSession.findFirst({
        where: {
          appointmentId,
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
      { error: error?.message || "Failed to pause appointment" },
      { status: 400 },
    );
  }
}
