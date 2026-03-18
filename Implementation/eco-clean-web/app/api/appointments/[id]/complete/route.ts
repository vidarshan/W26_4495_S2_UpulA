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
          status: "COMPLETED",
          completedAt: new Date(),
          timeSpent: Math.floor(totalSeconds / 60), // store minutes
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
      { error: error?.message || "Failed to complete appointment" },
      { status: 400 },
    );
  }
}
