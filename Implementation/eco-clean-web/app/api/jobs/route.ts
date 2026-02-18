import { prisma } from "@/lib/prisma";
import { AppointmentStatus, JobType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      title,
      clientId,
      staffId = [],
      addressId,
      jobType,
      startDate,
      startTime,
      endTime,
      isAnytime,
      recurrence,
      visitInstructions,
    } = body;

    if (!title || !clientId || !addressId || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(startDate);

    if (!isAnytime) {
      if (!startTime || !endTime) {
        return NextResponse.json(
          { error: "Start and End time required" },
          { status: 400 },
        );
      }

      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);

      start.setHours(sh, sm, 0, 0);
      end.setHours(eh, em, 0, 0);

      if (end <= start) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const duration = end.getTime() - start.getTime();

      const job = await tx.job.create({
        data: {
          title,
          type: jobType as JobType,
          clientId,
          addressId,
          isAnytime,
          visitInstructions,
          staffMembers: {
            connect: staffId.map((id: string) => ({ id })),
          },
        },
      });

      // ONE OFF
      if (jobType === JobType.ONE_OFF) {
        await tx.appointment.create({
          data: {
            jobId: job.id,
            startTime: start,
            endTime: end,
            status: AppointmentStatus.SCHEDULED,
          },
        });
      }

      // RECURRING
      if (jobType === JobType.RECURRING && recurrence) {
        const { frequency, interval, endType, endsAfter, endsOn } = recurrence;

        await tx.recurrence.create({
          data: {
            jobId: job.id,
            frequency,
            interval,
            endType,
            endsAfter: endType === "after" ? endsAfter : null,
            endsOn: endType === "on" && endsOn ? new Date(endsOn) : null,
          },
        });

        const appointments: Prisma.AppointmentCreateManyInput[] = [];
        const current = new Date(start);

        let count = 0;

        while (true) {
          if (endType === "after" && endsAfter && count >= endsAfter) break;

          if (endType === "on" && endsOn && current > new Date(endsOn)) break;

          appointments.push({
            jobId: job.id,
            startTime: new Date(current),
            endTime: new Date(current.getTime() + duration),
            status: AppointmentStatus.SCHEDULED,
          });

          if (frequency === "weekly") {
            current.setDate(current.getDate() + 7 * interval);
          }

          if (frequency === "monthly") {
            current.setMonth(current.getMonth() + interval);
          }

          count++;
        }

        if (appointments.length > 0) {
          await tx.appointment.createMany({
            data: appointments,
          });
        }
      }

      return job;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create Job Error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const clientId = searchParams.get("clientId");
    const type = searchParams.get("type"); // ONE_OFF | RECURRING

    const jobs = await prisma.job.findMany({
      where: {
        ...(clientId && { clientId }),
        ...(type && { type: type as JobType }),
      },
      include: {
        client: true,
        address: true,
        staffMembers: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        recurrence: true,
        appointments: {
          orderBy: {
            startTime: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("GET Jobs Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }
}
