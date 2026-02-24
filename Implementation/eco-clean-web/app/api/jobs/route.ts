import { prisma } from "@/lib/prisma";
import { LineItem } from "@/types";
import { AppointmentStatus, JobType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function parseHHmm(value: unknown) {
  if (typeof value !== "string") return null;
  const m = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return { h: Number(m[1]), min: Number(m[2]) };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addWeeks(date: Date, weeks: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + 7 * weeks);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function asDate(value: Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildStartEnd(dateOnly: Date, startTime: string, endTime: string) {
  const st = parseHHmm(startTime);
  const et = parseHHmm(endTime);
  if (!st || !et) return null;

  const start = new Date(dateOnly);
  start.setHours(st.h, st.min, 0, 0);

  const end = new Date(dateOnly);
  end.setHours(et.h, et.min, 0, 0);

  return { start, end };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      title,
      clientId,
      addressId,
      jobType,
      isAnytime = false,
      visitInstructions,
      lineItems = [],
      appointments = [],
      recurrence,
    } = body;

    if (!title || !clientId || !addressId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // For recurring, you usually want at least one "template" appointment
    if (!appointments?.length) {
      return NextResponse.json(
        { error: "At least one appointment is required" },
        { status: 400 },
      );
    }

    // Validate non-anytime times
    if (!isAnytime) {
      for (const appt of appointments) {
        if (!appt?.startDate) continue;
        if (!parseHHmm(appt.startTime) || !parseHHmm(appt.endTime)) {
          return NextResponse.json(
            {
              error: "Invalid startTime/endTime. Expected HH:mm (e.g., 09:30)",
            },
            { status: 400 },
          );
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) Create Job
      const job = await tx.job.create({
        data: {
          title,
          type: jobType as JobType,
          clientId,
          addressId,
          isAnytime,
          visitInstructions,
          lineItems: {
            create: lineItems.map((li: LineItem) => ({
              name: li.name,
              quantity: li.quantity,
              unitCost: li.unitCost,
              unitPrice: li.unitPrice,
              description: li.description,
            })),
          },
        },
      });

      const createdAppointments: any[] = [];

      // helper: create one appt instance at a specific dateOnly
      const createApptInstance = async (template: any, dateOnly: Date) => {
        const date = startOfDay(dateOnly);

        let start: Date;
        let end: Date;

        if (isAnytime) {
          // For anytime: define your own convention
          // Example: store start=end at midnight (or set a default duration)
          start = new Date(date);
          end = new Date(date);
        } else {
          const built = buildStartEnd(
            date,
            template.startTime,
            template.endTime,
          );
          if (!built) return null;
          start = built.start;
          end = built.end;
        }

        const data: Prisma.AppointmentCreateInput = {
          job: { connect: { id: job.id } },
          startTime: start,
          endTime: end,
          status: AppointmentStatus.SCHEDULED,
        };

        if (Array.isArray(template.staffId) && template.staffId.length) {
          data.staff = {
            connect: template.staffId.map((id: string) => ({ id })),
          };
        }

        if (typeof template.notes === "string" && template.notes.trim()) {
          data.notes = { create: [{ content: template.notes }] };
        }

        if (Array.isArray(template.images) && template.images.length) {
          data.images = {
            create: template.images
              .map((img: any) => {
                // expect objects from UploadThing
                if (img && typeof img === "object") {
                  const url = img.url;
                  const fileKey = img.fileKey ?? img.key;
                  if (!url) return null;

                  return {
                    url,
                    ...(fileKey ? { fileKey } : {}), // only set if present
                  };
                }

                // if someone sent just a string url, we can store it but cannot delete file later
                if (typeof img === "string") {
                  return { url: img };
                }

                return null;
              })
              .filter(Boolean) as any[],
          };
        }

        return tx.appointment.create({ data });
      };

      // 2) ONE_OFF: create as provided
      if (jobType === JobType.ONE_OFF) {
        for (const appt of appointments) {
          const date = asDate(appt.startDate);
          if (!date) continue;
          const created = await createApptInstance(appt, date);
          if (created) createdAppointments.push(created);
        }
      }

      // 3) RECURRING: create recurrence + generate occurrences
      if (jobType === JobType.RECURRING) {
        if (!recurrence) {
          throw new Error("Recurrence details missing for recurring job");
        }

        const { frequency, interval, endType, endsAfter, endsOn } = recurrence;

        const safeInterval =
          Number.isFinite(interval) && interval > 0 ? interval : 1;

        const endsOnDate = endType === "on" && endsOn ? asDate(endsOn) : null;

        const safeEndsAfter =
          endType === "after" && Number.isFinite(endsAfter) && endsAfter > 0
            ? endsAfter
            : null;

        await tx.recurrence.create({
          data: {
            jobId: job.id,
            frequency,
            interval: safeInterval,
            endType,
            endsAfter: safeEndsAfter,
            endsOn: endsOnDate,
          },
        });

        for (const template of appointments) {
          const firstDate = asDate(template.startDate);
          if (!firstDate) continue;

          let cursor = startOfDay(firstDate);
          let count = 0;

          while (true) {
            // stop conditions
            if (safeEndsAfter && count >= safeEndsAfter) break;
            if (endsOnDate && cursor > startOfDay(endsOnDate)) break;

            const created = await createApptInstance(template, cursor);
            if (created) createdAppointments.push(created);

            // advance
            if (frequency === "weekly") cursor = addWeeks(cursor, safeInterval);
            else if (frequency === "monthly")
              cursor = addMonths(cursor, safeInterval);
            else {
              // if you add more frequencies later
              throw new Error(`Unsupported frequency: ${frequency}`);
            }

            count++;
          }
        }
      }

      return { job, appointments: createdAppointments };
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
