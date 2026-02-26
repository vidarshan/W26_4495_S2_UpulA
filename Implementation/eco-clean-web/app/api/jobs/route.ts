export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus, JobType } from "@prisma/client";

// Infer tx type from prisma.$transaction callback signature
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type IncomingBody =
  | string
  | {
      title?: string;
      clientId?: string;
      addressId?: string;
      jobType?: JobType; // "ONE_OFF" | "RECURRING"
      isAnytime?: boolean;
      visitInstructions?: string | null;

      lineItems?: Array<{
        id?: string; // ignored
        name?: string;
        quantity?: number;
        unitCost?: number;
        unitPrice?: number;
        description?: string | null;
      }>;

      appointments?: Array<{
        id?: string; // ignored
        // you send ISO datetime like "2026-02-25T08:00:00.000Z"
        startDate?: string;
        startTime?: string | null; // "07:00"
        endTime?: string | null; // "09:30"
        staffId?: string[]; // ["userId1", ...]
        notes?: string | null;
        images?: Array<{ url: string; fileKey?: string }>;
      }>;

      recurrence?: {
        frequency: "weekly" | "monthly";
        interval: number;
        endType: "after" | "on";
        endsAfter?: number | null;
        endsOn?: string | null; // "YYYY-MM-DD"
      } | null;
    };

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

async function readJson(req: NextRequest) {
  const raw = (await req.json()) as IncomingBody;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Exclude<IncomingBody, string>;
    } catch {
      return null;
    }
  }
  return raw as Exclude<IncomingBody, string>;
}

function buildStartEndUTC(
  baseIso: string,
  startTime?: string | null,
  endTime?: string | null,
  isAnytime?: boolean,
) {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return null;

  const start = new Date(base);
  const end = new Date(base);

  if (!isAnytime) {
    if (startTime) {
      const [h, m] = startTime.split(":");
      start.setUTCHours(Number(h), Number(m), 0, 0);
    }
    if (endTime) {
      const [h, m] = endTime.split(":");
      end.setUTCHours(Number(h), Number(m), 0, 0);
    } else {
      end.setTime(start.getTime() + 60 * 60 * 1000);
    }
  } else {
    // anytime: keep date, default 1 hour window
    end.setTime(start.getTime() + 60 * 60 * 1000);
  }

  // Ensure end after start
  if (end.getTime() <= start.getTime()) {
    end.setTime(start.getTime() + 30 * 60 * 1000);
  }

  return { start, end };
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

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

    if (!title || !clientId || !addressId || !jobType) {
      return NextResponse.json(
        {
          error: "Missing required fields: title, clientId, addressId, jobType",
        },
        { status: 400 },
      );
    }

    // For ONE_OFF we need at least 1 appointment in the payload
    if (jobType === "ONE_OFF" && appointments.length === 0) {
      return NextResponse.json(
        { error: "Missing appointments (need at least one for ONE_OFF)" },
        { status: 400 },
      );
    }

    // pick base schedule from first appointment for recurring generation too
    const appt0 = appointments[0];
    const baseIso =
      appt0?.startDate ??
      (() => {
        // If recurring but no appointments array is provided, you could require a startDate field.
        // For now, enforce appointments[0].startDate.
        return undefined;
      })();

    if (jobType === "RECURRING" && !baseIso) {
      return NextResponse.json(
        { error: "Missing appointments[0].startDate for RECURRING" },
        { status: 400 },
      );
    }

    if (jobType === "RECURRING" && !recurrence) {
      return NextResponse.json(
        { error: "Missing recurrence data for RECURRING" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) Create job
      const job = await tx.job.create({
        data: {
          title,
          type: jobType,
          client: { connect: { id: clientId } },
          address: { connect: { id: addressId } },
          isAnytime,
          ...(visitInstructions ? { visitInstructions } : {}),
        },
      });

      // 2) Create line items
      if (lineItems.length) {
        await tx.jobLineItem.createMany({
          data: lineItems
            .filter((li) => li?.name && typeof li.quantity === "number")
            .map((li) => {
              const qty = Number(li.quantity ?? 0);
              const unitPrice = li.unitPrice ?? null;
              const total =
                unitPrice != null && !Number.isNaN(unitPrice)
                  ? qty * unitPrice
                  : null;

              return {
                jobId: job.id,
                name: li.name!,
                quantity: qty,
                unitCost: li.unitCost ?? null,
                unitPrice: li.unitPrice ?? null,
                total,
                description: li.description ?? null,
              };
            }),
        });
      }

      // Helper to create one appointment + nested notes/images/staff
      const createAppointmentWithExtras = async (
        a: NonNullable<(typeof appointments)[number]>,
        fallbackIso: string,
      ) => {
        const iso = a.startDate ?? fallbackIso;
        const built = buildStartEndUTC(
          iso,
          a.startTime ?? null,
          a.endTime ?? null,
          isAnytime,
        );
        if (!built) {
          throw new Error(`Invalid appointment.startDate: ${String(iso)}`);
        }

        const created = await tx.appointment.create({
          data: {
            jobId: job.id,
            startTime: built.start,
            endTime: built.end,
            status: AppointmentStatus.SCHEDULED,
            staff: a.staffId?.length
              ? { connect: a.staffId.map((id) => ({ id })) }
              : undefined,
          },
        });

        // VisitNote (your model requires content)
        if (a.notes && a.notes.trim().length) {
          await tx.visitNote.create({
            data: {
              appointmentId: created.id,
              content: a.notes.trim(),
              isClientVisible: false,
            },
          });
        }

        // Images
        if (a.images?.length) {
          await tx.appointmentImage.createMany({
            data: a.images
              .filter((img) => img?.url)
              .map((img) => ({
                appointmentId: created.id,
                url: img.url,
                fileKey: img.fileKey ?? null,
              })),
          });
        }

        return created;
      };

      // 3) Create appointments
      if (jobType === "ONE_OFF") {
        // Create one appointment per item in payload
        // (If you only want the first one, change to appointments.slice(0,1))
        const fallbackIsoForAll = appointments[0].startDate!;
        for (const a of appointments) {
          await createAppointmentWithExtras(a, fallbackIsoForAll);
        }
      }

      if (jobType === "RECURRING") {
        const { frequency, interval, endType, endsAfter, endsOn } = recurrence!;

        // Store recurrence row
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

        // Generate appointments
        // base appointment defines time window
        const baseBuilt = buildStartEndUTC(
          baseIso!,
          appt0?.startTime ?? null,
          appt0?.endTime ?? null,
          isAnytime,
        );
        if (!baseBuilt) {
          throw new Error(
            `Invalid base appointments[0].startDate: ${String(baseIso)}`,
          );
        }

        const durationMs = baseBuilt.end.getTime() - baseBuilt.start.getTime();

        const current = new Date(baseBuilt.start);
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
          apptEnd.setTime(
            apptStart.getTime() + Math.max(durationMs, 30 * 60 * 1000),
          );

          await tx.appointment.create({
            data: {
              jobId: job.id,
              startTime: apptStart,
              endTime: apptEnd,
              status: AppointmentStatus.SCHEDULED,
              // Optional: apply the same staff from appt0 to all occurrences
              staff: appt0?.staffId?.length
                ? { connect: appt0.staffId.map((id) => ({ id })) }
                : undefined,
            },
          });

          if (frequency === "weekly")
            current.setUTCDate(current.getUTCDate() + 7 * interval);
          if (frequency === "monthly")
            current.setUTCMonth(current.getUTCMonth() + interval);

          count++;
        }
      }

      // Return job with nested data
      return tx.job.findUnique({
        where: { id: job.id },
        include: {
          lineItems: true,
          appointments: { include: { staff: true, images: true, notes: true } },
          recurrence: true,
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/jobs error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        detail: String(error?.message ?? error),
      },
      { status: 500 },
    );
  }
}
