import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      title,
      clientId,
      staffId,
      addressId,
      jobType,
      startDate,
      startTime,
      endTime,
      isAnytime,
      recurrence,
      visitInstructions,
    } = body;

    if (!title || !clientId || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Combine date + time
    const start = new Date(startDate);
    const end = new Date(startDate);

    if (!isAnytime) {
      if (startTime) {
        const [h, m] = startTime.split(":");
        start.setHours(Number(h), Number(m));
      }

      if (endTime) {
        const [h, m] = endTime.split(":");
        end.setHours(Number(h), Number(m));
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          title,
          type: jobType,
          clientId,
          staffId,
          addressId,
        },
      });

      if (jobType === "ONE_OFF") {
        await tx.appointment.create({
          data: {
            jobId: job.id,
            startTime: start,
            endTime: end,
            status: "SCHEDULED",
          },
        });
      }

      if (jobType === "RECURRING") {
        const { frequency, interval, endType, endsAfter, endsOn } = recurrence;

        await tx.recurrence.create({
          data: {
            jobId: job.id,
            frequency,
            interval,
            endsAfter: endType === "after" ? endsAfter : null,
            endsOn: endType === "on" ? new Date(endsOn) : null,
          },
        });

        // Generate recurring visits
        const current = new Date(start);
        let count = 0;

        while (true) {
          if (endType === "after" && count >= endsAfter) break;
          if (endType === "on" && current > new Date(endsOn)) break;

          await tx.appointment.create({
            data: {
              jobId: job.id,
              startTime: new Date(current),
              endTime: new Date(current),
              status: "SCHEDULED",
            },
          });

          // Move forward
          if (frequency === "weekly") {
            current.setDate(current.getDate() + 7 * interval);
          }

          if (frequency === "monthly") {
            current.setMonth(current.getMonth() + interval);
          }

          count++;
        }
      }

      return job;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
