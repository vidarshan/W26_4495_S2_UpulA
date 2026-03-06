export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function colorFromString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++)
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 35%)`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const staffId = searchParams.get("staffId");

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "Missing date range" },
        { status: 400 },
      );
    }

    const rangeStart = new Date(startParam);
    const rangeEnd = new Date(endParam);

    if (
      Number.isNaN(rangeStart.getTime()) ||
      Number.isNaN(rangeEnd.getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 },
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        AND: [{ startTime: { lt: rangeEnd } }, { endTime: { gt: rangeStart } }],
        ...(staffId ? { staff: { some: { id: staffId } } } : {}),
      },
      include: {
        job: { include: { client: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const events = appointments.map((a) => ({
      id: a.id,
      title: `${a.job.title} - ${a.job.client.firstName}`,
      start: a.startTime.toISOString(),
      end: a.endTime.toISOString(),
      extendedProps: {
        jobId: a.jobId,
        status: a.status,
        staff: a.staff,
      },
    }));

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 },
    );
  }
}
