export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import randomColor from "randomcolor";

type AppointmentWithJobClient = {
  id: string;
  jobId: string;
  status: string;
  startTime: Date;
  endTime: Date;
  job: {
    title: string;
    client: {
      firstName: string;
      // add more client fields if you use them in extendedProps
      // lastName?: string;
      // email?: string;
    };
  };
};

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

    const appointments = (await prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        AND: [{ startTime: { lt: rangeEnd } }, { endTime: { gt: rangeStart } }],
      },
      include: {
        job: { include: { client: true } },
      },
      orderBy: { startTime: "asc" },
    })) as AppointmentWithJobClient[];

    const events = appointments.map((appt: AppointmentWithJobClient) => {
      const color = randomColor({ luminosity: "dark" });

      return {
        id: appt.id,
        title: `${appt.job.title} - ${appt.job.client.firstName}`,
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
