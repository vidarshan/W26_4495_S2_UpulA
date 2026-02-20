import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import randomColor from "randomcolor";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

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

    // ✅ Correct overlap logic:
    // event overlaps range if it starts before rangeEnd AND ends after rangeStart
    const appointments = await prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        AND: [{ startTime: { lt: rangeEnd } }, { endTime: { gt: rangeStart } }],
      },
      include: {
        job: { include: { client: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const events = appointments.map((appt) => {
      const color = randomColor({ luminosity: "dark" });

      return {
        id: appt.id,
        title: `${appt.job.title} - ${appt.job.client.firstName}`,
        // ✅ Always send ISO strings (not Date objects)
        // This removes ambiguity and makes FullCalendar parsing consistent.
        start: appt.startTime.toISOString(),
        end: appt.endTime.toISOString(),
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          jobId: appt.jobId,
          status: appt.status,
          client: appt.job.client,
        },
      };
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET Appointments Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 },
    );
  }
}
