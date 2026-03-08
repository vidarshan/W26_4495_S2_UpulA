export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus, JobType, Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { LineItem } from "@/lib/api/jobs";
import { buildUtcWindowFromLocal } from "@/lib/dateTime";

const APP_TZ = process.env.APP_TZ ?? "America/Vancouver";

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

function buildStartEnd(
  baseIsoOrDate: string,
  startTime?: string | null,
  endTime?: string | null,
  isAnytime?: boolean,
) {
  // baseIsoOrDate is coming from JSON.stringify(Date) => ISO with Z
  const base = DateTime.fromISO(baseIsoOrDate, { zone: APP_TZ });
  if (!base.isValid) return null;

  // pick defaults
  const sStr = !isAnytime ? startTime || "09:00" : "09:00";
  const eStr = !isAnytime ? endTime || "" : "";

  const [sh, sm] = sStr.split(":").map(Number);
  let start = base.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });

  let end: DateTime;
  if (eStr) {
    const [eh, em] = eStr.split(":").map(Number);
    end = base.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
  } else {
    end = start.plus({ hours: 1 });
  }

  if (end <= start) end = start.plus({ minutes: 30 });

  // store UTC in DB (timestamptz will normalize)
  return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
}

type CreateJobBody = {
  title: string;
  clientId: string;
  addressId: string;
  jobType: JobType;
  isAnytime?: boolean;
  visitInstructions?: string | null;

  lineItems?: Array<{
    name: string;
    quantity: number;
    unitCost?: number | null;
    unitPrice?: number | null;
    description?: string | null;
  }>;

  appointments: Array<{
    date: string; // ✅ "YYYY-MM-DD"
    startTime: string | null; // ✅ "HH:mm"
    endTime: string | null; // ✅ "HH:mm"
    staffIds: string[]; // ✅ always array
    note?: string | null;
    images?: Array<{ url: string; fileKey?: string | null }>;
  }>;

  recurrence?: {
    frequency: "weekly" | "monthly";
    interval: number;
    endType: "after" | "on";
    endsAfter?: number | null;
    endsOn?: string | null; // ✅ "YYYY-MM-DD"
  } | null;
};

function must(condition: any, msg: string) {
  if (!condition) throw new Error(msg);
}

function mustString(v: unknown, msg: string) {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(msg);
  return v.trim();
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    console.log("RAW:", raw);

    let body: unknown;

    try {
      body = JSON.parse(raw);
      // handle double-encoded JSON: "\"{...}\""
      if (typeof body === "string") {
        body = JSON.parse(body);
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const b = body as Record<string, any>;

    const title = mustString(b.title, "Missing title");
    const clientId = mustString(b.clientId, "Missing clientId");
    const addressId = mustString(b.addressId, "Missing addressId");
    const jobType = mustString(b.jobType, "Missing jobType") as
      | "ONE_OFF"
      | "RECURRING";

    const isAnytime = !!b.isAnytime;
    const lineItems = b.lineItems ?? [];
    const appointments = b.appointments ?? [];

    if (jobType === "ONE_OFF") {
      must(
        Array.isArray(appointments) && appointments.length >= 1,
        "ONE_OFF requires at least 1 appointment",
      );
      for (const [i, a] of appointments.entries()) {
        must(a?.date, `appointments[${i}].date is required`);
      }
    }

    if (jobType === "RECURRING") {
      must(
        appointments.length >= 1,
        "RECURRING requires a base appointment in appointments[0]",
      );
      must(appointments[0]?.date, "RECURRING requires appointments[0].date");
      must(b.recurrence, "RECURRING requires recurrence object");
      must(b.recurrence!.interval >= 1, "recurrence.interval must be >= 1");
      if (b.recurrence!.endType === "after") {
        must(
          (b.recurrence!.endsAfter ?? 0) >= 1,
          "recurrence.endsAfter must be >= 1",
        );
      }
      if (b.recurrence!.endType === "on") {
        must(
          b.recurrence!.endsOn,
          "recurrence.endsOn is required when endType='on'",
        );
      }
    }

    const result = await prisma.$transaction(async (tx: Tx) => {
      // 1) Create Job
      const job = await tx.job.create({
        data: {
          title,
          type: jobType,
          client: { connect: { id: clientId } },
          address: { connect: { id: addressId } },
          isAnytime,
          visitInstructions:
            typeof b.visitInstructions === "string" &&
            b.visitInstructions.trim()
              ? b.visitInstructions.trim()
              : null,
        },
      });

      // 2) Line items
      if (lineItems.length) {
        await tx.jobLineItem.createMany({
          data: lineItems
            .filter(
              (li: LineItem) =>
                li?.name?.trim() &&
                typeof li.quantity === "number" &&
                li.quantity > 0,
            )
            .map((li: LineItem) => {
              const qty = Math.trunc(Number(li.quantity));
              const unitPrice = li.unitPrice ?? null;
              const total = unitPrice != null ? qty * unitPrice : null;
              return {
                jobId: job.id,
                name: li.name.trim(),
                quantity: qty,
                unitCost: li.unitCost ?? null,
                unitPrice: unitPrice ?? null,
                total,
                description: li.description ?? null,
              };
            }),
        });
      }

      // helper: create one appointment + note/images/staff
      const createOne = async (a: CreateJobBody["appointments"][number]) => {
        const win = buildUtcWindowFromLocal(
          a.date,
          a.startTime,
          a.endTime,
          isAnytime,
        );
        must(win, `Invalid appointment date/time: ${a.date}`);

        const created = await tx.appointment.create({
          data: {
            jobId: job.id,
            startTime: win!.startUtc,
            endTime: win!.endUtc,
            status: AppointmentStatus.SCHEDULED,
            staff: a.staffIds?.length
              ? { connect: a.staffIds.map((id) => ({ id })) }
              : undefined,
          },
        });

        if (a.note?.trim()) {
          await tx.visitNote.create({
            data: {
              appointmentId: created.id,
              content: a.note.trim(),
              isClientVisible: false,
            },
          });
        }

        const imgs = a.images ?? [];
        if (imgs.length) {
          await tx.appointmentImage.createMany({
            data: imgs
              .filter((img) => !!img?.url)
              .map((img) => ({
                appointmentId: created.id,
                url: img.url,
                fileKey: img.fileKey ?? null,
              })),
          });
        }

        return created;
      };

      // 3) Appointments
      if (b.jobType === "ONE_OFF") {
        for (const a of appointments) await createOne(a);
      }

      if (b.jobType === "RECURRING") {
        const rec = b.recurrence!;
        const base = appointments[0];

        // store recurrence
        await tx.recurrence.create({
          data: {
            jobId: job.id,
            frequency: rec.frequency,
            interval: rec.interval,
            endType: rec.endType,
            endsAfter: rec.endType === "after" ? (rec.endsAfter ?? null) : null,
            endsOn:
              rec.endType === "on" && rec.endsOn ? new Date(rec.endsOn) : null,
          },
        });

        // Build base local cursor (DST-safe) using Luxon
        const APP_TZ = process.env.APP_TZ ?? "America/Vancouver";
        const baseLocal = DateTime.fromFormat(base.date, "yyyy-LL-dd", {
          zone: APP_TZ,
        });
        must(baseLocal.isValid, "Invalid base date");

        const startStr = isAnytime ? "09:00" : base.startTime || "09:00";
        const [sh, sm] = startStr.split(":").map(Number);

        let cursor = baseLocal.set({
          hour: sh,
          minute: sm,
          second: 0,
          millisecond: 0,
        });
        must(cursor.isValid, "Invalid base start time");

        // duration based on base
        const baseWin = buildUtcWindowFromLocal(
          base.date,
          base.startTime,
          base.endTime,
          isAnytime,
        );
        must(baseWin, "Invalid base appointment window");
        const durationMs = baseWin!.durationMs;

        const endOnLocal =
          rec.endType === "on" && rec.endsOn
            ? DateTime.fromFormat(rec.endsOn, "yyyy-LL-dd", {
                zone: APP_TZ,
              }).endOf("day")
            : null;

        let count = 0;
        const max = rec.endType === "after" ? (rec.endsAfter ?? 0) : 10_000; // safety

        while (true) {
          if (rec.endType === "after") {
            if (count >= max) break;
          } else if (rec.endType === "on" && endOnLocal) {
            if (cursor > endOnLocal) break;
          }

          const startUtc = cursor.toUTC().toJSDate();
          const endUtc = cursor
            .plus({ milliseconds: durationMs })
            .toUTC()
            .toJSDate();

          await tx.appointment.create({
            data: {
              jobId: job.id,
              startTime: startUtc,
              endTime: endUtc,
              status: AppointmentStatus.SCHEDULED,
              staff: base.staffIds?.length
                ? {
                    connect: base.staffIds.map(
                      (id: string): Prisma.UserWhereUniqueInput => ({ id }),
                    ),
                  }
                : undefined,
            },
          });

          cursor =
            rec.frequency === "weekly"
              ? cursor.plus({ weeks: rec.interval })
              : cursor.plus({ months: rec.interval });

          count++;
          if (count > 10_000)
            throw new Error("Recurrence too large; aborting for safety");
        }
      }

      // Return fully included job (including staff inside appointments)
      return tx.job.findUnique({
        where: { id: job.id },
        include: {
          client: true,
          address: true,
          lineItems: true,
          recurrence: true,
          appointments: {
            include: {
              staff: {
                select: { id: true, name: true, email: true, role: true },
              },
              notes: true,
              images: true,
            },
            orderBy: { startTime: "asc" },
          },
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/jobs error:", error);
    return NextResponse.json(
      { error: "Bad request", detail: String(error?.message ?? error) },
      { status: 400 },
    );
  }
}
