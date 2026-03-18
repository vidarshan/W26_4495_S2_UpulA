export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function colorFromString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 35%)`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const staffId = searchParams.get("staffId");
    const view = searchParams.get("view");

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

    const andFilters: Prisma.AppointmentWhereInput[] = [
      { startTime: { lt: rangeEnd } },
      { endTime: { gt: rangeStart } },
    ];

    if (status) {
      andFilters.push({
        status: status as AppointmentStatus,
      });
    }

    if (search) {
      andFilters.push({
        OR: [
          {
            job: {
              title: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
          {
            job: {
              client: {
                firstName: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
          {
            job: {
              client: {
                lastName: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
          {
            job: {
              client: {
                companyName: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
        ],
      });
    }

    const where: Prisma.AppointmentWhereInput = {
      AND: andFilters,
      ...(staffId ? { assignments: { some: { staffId } } } : {}),
    };

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        job: { include: { client: true, address: true } },
        assignments: {
          include: {
            staff: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        images: true,
        notes: true,
      },
      orderBy: { startTime: "asc" },
    });

    if (view === "tasks") {
      return NextResponse.json(appointments);
    }

    const events = appointments.map((a) => {
      const staffMembers = a.assignments.map((assignment) => assignment.staff);

      return {
        id: a.id,
        title: `${a.job.title} - ${a.job.client.firstName}`,
        start: a.startTime.toISOString(),
        end: a.endTime.toISOString(),
        extendedProps: {
          jobId: a.jobId,
          status: a.status,
          staffNames: staffMembers.map((member) => member.name).join(", "),
          staffMembers,
        },
      };
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET /api/appointments error:", error);

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

    if (!jobId || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const appointmentId = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          jobId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: status || "SCHEDULED",
        },
      });

      if (Array.isArray(staffIds) && staffIds.length > 0) {
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

      return appt.id;
    });

    const createdAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        job: { include: { client: true, address: true } },
        assignments: {
          include: {
            staff: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        images: true,
        notes: true,
      },
    });

    return NextResponse.json(createdAppointment, { status: 201 });
  } catch (error) {
    console.error("POST Appointment Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
