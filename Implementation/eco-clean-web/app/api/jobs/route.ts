import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Infer tx type from prisma.$transaction callback signature
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type Body = {
  title?: string;
  clientId?: string;
  staffId?: string | null;
  addressId?: string | null;

  jobType?: "ONE_OFF" | "RECURRING";

  startDate?: string; // e.g. "2026-02-25"
  startTime?: string | null; // e.g. "13:30"
  endTime?: string | null; // e.g. "15:00"
  isAnytime?: boolean;

  recurrence?: {
    frequency: "weekly" | "monthly";
    interval: number;
    endType: "after" | "on";
    endsAfter?: number | null;
    endsOn?: string | null; // "YYYY-MM-DD"
  } | null;

  visitInstructions?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const {
      title,
      clientId,
      addressId,
      jobType,
      startDate,
      startTime,
      endTime,
      isAnytime = false,
      recurrence,
      visitInstructions,
    } = body;

    if (!title || !clientId || !startDate || !jobType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Combine date + time (basic)
    const start = new Date(startDate);
    const end = new Date(startDate);

    if (!isAnytime) {
      if (startTime) {
        const [h, m] = startTime.split(":");
        start.setHours(Number(h), Number(m), 0, 0);
      }

      if (endTime) {
        const [h, m] = endTime.split(":");
        end.setHours(Number(h), Number(m), 0, 0);
      } else {
        // default: 1 hour duration if endTime not provided
        end.setTime(start.getTime() + 60 * 60 * 1000);
      }
    } else {
      // anytime: set a sensible default window (optional)
      end.setTime(start.getTime() + 60 * 60 * 1000);
    }

    if (!addressId) {
      return NextResponse.json({ error: "Missing addressId" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx: Tx) => {
      const job = await tx.job.create({
        data: {
          title,
          type: jobType,
          client: { connect: { id: clientId } },
          address: { connect: { id: addressId } },
          ...(visitInstructions ? { visitInstructions } : {}),
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
        if (!recurrence) {
          return NextResponse.json(
            { error: "Missing recurrence data" },
            { status: 400 },
          );
        }

        const { frequency, interval, endType, endsAfter, endsOn } = recurrence;

        await tx.recurrence.create({
          data: {
            jobId: job.id,
            frequency,
            interval,
            endType,
            endsAfter: endType === "after" ? (endsAfter ?? null) : null,
            endsOn: endType === "on" && endsOn ? new Date(endsOn) : null,
          },
        });

        const current = new Date(start);
        let count = 0;

        while (true) {
          if (
            endType === "after" &&
            typeof endsAfter === "number" &&
            count >= endsAfter
          )
            break;
          if (endType === "on" && endsOn && current > new Date(endsOn)) break;

          const apptStart = new Date(current);
          const apptEnd = new Date(current);

          // keep same duration as the first appointment
          const durationMs = end.getTime() - start.getTime();
          apptEnd.setTime(
            apptStart.getTime() + Math.max(durationMs, 30 * 60 * 1000),
          ); // min 30m

          await tx.appointment.create({
            data: {
              jobId: job.id,
              startTime: apptStart,
              endTime: apptEnd,
              status: "SCHEDULED",
            },
          });

          if (frequency === "weekly")
            current.setDate(current.getDate() + 7 * interval);
          if (frequency === "monthly")
            current.setMonth(current.getMonth() + interval);

          count++;
        }
      }

      return job;
    });

    // If transaction returned a NextResponse (from the recurrence validation), pass it through
    if (result instanceof NextResponse) return result;

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/jobs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
