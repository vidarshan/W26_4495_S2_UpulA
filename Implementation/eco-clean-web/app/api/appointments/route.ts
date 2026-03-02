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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, startTime, endTime, status, staffIds } = body;

    // 1. Basic Validation
    if (!jobId || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Transaction to link Appointment and Staff (Assignment)
    const newAppointment = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          jobId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: status || "SCHEDULED",
          // Note: If using the original implicit many-to-many relation:
          staff: staffIds ? { connect: staffIds.map((id: string) => ({ id })) } : undefined,
        },
      });

      // 3. Optional: If using the new Assignment model, create those here too
      if (staffIds && Array.isArray(staffIds)) {
        await tx.assignment.createMany({
          data: staffIds.map((sid: string) => ({
            appointmentId: appt.id,
            staffId: sid,
            status: "PENDING",
            plannedStart: new Date(startTime),
            plannedEnd: new Date(endTime),
          })),
        });
      }

      return appt;
    });

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error) {
    console.error("POST Appointment Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
