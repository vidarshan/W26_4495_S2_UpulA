import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import randomColor from "randomcolor";

//fullcalendar variant
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "Missing date range" },
        { status: 400 },
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        startTime: {
          gte: new Date(start),
        },
        endTime: {
          lte: new Date(end),
        },
      },
      include: {
        job: {
          include: {
            client: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const events = appointments.map((appt) => {
      const color = randomColor({
        luminosity: "dark",
      });

      return {
        id: appt.id,
        title: `${appt.job.title} - ${appt.job.client.firstName}`,
        start: appt.startTime,
        end: appt.endTime,
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
