export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus, JobType } from "@prisma/client";
import { DateTime } from "luxon";
import { LineItem } from "@/lib/api/jobs";
import { buildUtcWindowFromLocal } from "@/lib/dateTime";

const APP_TZ = process.env.APP_TZ ?? "America/Vancouver";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type JobNoteCategory =
  | "GENERAL"
  | "ACCESS"
  | "CLEANING"
  | "SAFETY"
  | "SUPPLIES"
  | "CLIENT_PREFERENCE";

type CreateJobBody = {
  title: string;
  clientId: string;
  addressId: string;
  jobType: JobType;
  isAnytime?: boolean;
  visitInstructions?: string | null;

  notes?: Array<{
    title?: string | null;
    content: string;
    category?: JobNoteCategory | null;
    isClientVisible?: boolean;
    isPinned?: boolean;
    images?: Array<{ url: string; fileKey?: string | null }>;
  }>;

  lineItems?: Array<{
    name: string;
    quantity: number;
    unitCost?: number | null;
    unitPrice?: number | null;
    description?: string | null;
  }>;

  appointments: Array<{
    date: string;
    startTime: string | null;
    endTime: string | null;
    staffIds: string[];
    note?: string | null;
    images?: Array<{ url: string; fileKey?: string | null }>;
  }>;

  recurrence?: {
    frequency: "weekly" | "monthly";
    interval: number;
    endType: "after" | "on";
    endsAfter?: number | null;
    endsOn?: string | null;
  } | null;
};

function must(condition: unknown, msg: string) {
  if (!condition) throw new Error(msg);
}

function mustString(v: unknown, msg: string) {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(msg);
  return v.trim();
}

function normalizeNotes(rawNotes: unknown) {
  if (!Array.isArray(rawNotes)) return [];

  const allowedCategories = new Set<JobNoteCategory>([
    "GENERAL",
    "ACCESS",
    "CLEANING",
    "SAFETY",
    "SUPPLIES",
    "CLIENT_PREFERENCE",
  ]);

  return rawNotes
    .filter(
      (note): note is Record<string, unknown> =>
        !!note && typeof note === "object",
    )
    .map((note) => {
      const title =
        typeof note.title === "string" && note.title.trim().length
          ? note.title.trim()
          : null;

      const content =
        typeof note.content === "string" ? note.content.trim() : "";

      const category =
        typeof note.category === "string" &&
        allowedCategories.has(note.category as JobNoteCategory)
          ? (note.category as JobNoteCategory)
          : null;

      const isClientVisible = !!note.isClientVisible;
      const isPinned = !!note.isPinned;

      const images = Array.isArray(note.images)
        ? note.images
            .filter(
              (img): img is Record<string, unknown> =>
                !!img &&
                typeof img === "object" &&
                typeof img.url === "string" &&
                img.url.trim().length > 0,
            )
            .map((img) => ({
              url: String(img.url).trim(),
              fileKey:
                typeof img.fileKey === "string" && img.fileKey.trim().length
                  ? img.fileKey.trim()
                  : null,
            }))
        : [];

      return {
        title,
        content,
        category,
        isClientVisible,
        isPinned,
        images,
      };
    })
    .filter((note) => note.content.length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const b = parsed as Record<string, unknown>;

    const title = mustString(b.title, "Missing title");
    const clientId = mustString(b.clientId, "Missing clientId");
    const addressId = mustString(b.addressId, "Missing addressId");
    const jobType = mustString(b.jobType, "Missing jobType") as JobType;
    const isAnytime = !!b.isAnytime;

    const lineItems = Array.isArray(b.lineItems) ? b.lineItems : [];
    const appointments = Array.isArray(b.appointments) ? b.appointments : [];
    const notes = normalizeNotes(b.notes);

    if (jobType !== "ONE_OFF" && jobType !== "RECURRING") {
      return NextResponse.json({ error: "Invalid jobType" }, { status: 400 });
    }

    if (jobType === "ONE_OFF") {
      must(appointments.length >= 1, "ONE_OFF requires at least 1 appointment");
      for (const [i, a] of appointments.entries()) {
        must(
          a &&
            typeof a === "object" &&
            "date" in a &&
            typeof (a as Record<string, unknown>).date === "string" &&
            (a as Record<string, unknown>).date,
          `appointments[${i}].date is required`,
        );
      }
    }

    if (jobType === "RECURRING") {
      must(
        appointments.length >= 1,
        "RECURRING requires a base appointment in appointments[0]",
      );

      const base = appointments[0] as Record<string, unknown>;
      must(
        typeof base.date === "string" && base.date,
        "RECURRING requires appointments[0].date",
      );

      const recurrence = b.recurrence as
        | Record<string, unknown>
        | null
        | undefined;

      must(recurrence, "RECURRING requires recurrence object");
      must(
        typeof recurrence?.interval === "number" && recurrence.interval >= 1,
        "recurrence.interval must be >= 1",
      );

      if (recurrence?.endType === "after") {
        must(
          typeof recurrence.endsAfter === "number" && recurrence.endsAfter >= 1,
          "recurrence.endsAfter must be >= 1",
        );
      }

      if (recurrence?.endType === "on") {
        must(
          typeof recurrence.endsOn === "string" && recurrence.endsOn,
          "recurrence.endsOn is required when endType='on'",
        );
      }
    }

    const result = await prisma.$transaction(async (tx: Tx) => {
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
          notes: notes.length
            ? {
                create: notes.map((note) => ({
                  title: note.title,
                  content: note.content,
                  category: note.category,
                  isClientVisible: note.isClientVisible,
                  isPinned: note.isPinned,
                  createdById: null,
                  images: note.images.length
                    ? {
                        create: note.images.map((img) => ({
                          url: img.url,
                          fileKey: img.fileKey,
                        })),
                      }
                    : undefined,
                })),
              }
            : undefined,
        },
      });

      if (lineItems.length) {
        const validLineItems = lineItems
          .filter(
            (li: unknown): li is LineItem =>
              !!li &&
              typeof li === "object" &&
              typeof (li as Record<string, unknown>).name === "string" &&
              !!(li as Record<string, unknown>).name &&
              typeof (li as Record<string, unknown>).quantity === "number" &&
              ((li as Record<string, unknown>).quantity as number) > 0,
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
              unitPrice,
              total,
              description: li.description ?? null,
            };
          });

        if (validLineItems.length) {
          await tx.jobLineItem.createMany({ data: validLineItems });
        }
      }

      const createOne = async (
        a: CreateJobBody["appointments"][number],
        opts?: { createVisitNoteAndImages?: boolean },
      ) => {
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
            assignments: a.staffIds?.length
              ? {
                  create: a.staffIds.map((staffId) => ({
                    staff: { connect: { id: staffId } },
                  })),
                }
              : undefined,
          },
        });

        if (opts?.createVisitNoteAndImages !== false) {
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
            const validImgs = imgs
              .filter((img) => !!img?.url)
              .map((img) => ({
                appointmentId: created.id,
                url: img.url,
                fileKey: img.fileKey ?? null,
              }));

            if (validImgs.length) {
              await tx.appointmentImage.createMany({ data: validImgs });
            }
          }
        }

        return created;
      };

      if (jobType === "ONE_OFF") {
        for (const rawAppt of appointments) {
          const a = rawAppt as CreateJobBody["appointments"][number];
          await createOne(a);
        }
      }

      if (jobType === "RECURRING") {
        const rec = b.recurrence as NonNullable<CreateJobBody["recurrence"]>;
        const base = appointments[0] as CreateJobBody["appointments"][number];

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
        const max = rec.endType === "after" ? (rec.endsAfter ?? 0) : 10_000;

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

          const created = await tx.appointment.create({
            data: {
              jobId: job.id,
              startTime: startUtc,
              endTime: endUtc,
              status: AppointmentStatus.SCHEDULED,
              assignments: base.staffIds?.length
                ? {
                    create: base.staffIds.map((staffId) => ({
                      staff: { connect: { id: staffId } },
                    })),
                  }
                : undefined,
            },
          });

          if (base.note?.trim()) {
            await tx.visitNote.create({
              data: {
                appointmentId: created.id,
                content: base.note.trim(),
                isClientVisible: false,
              },
            });
          }

          const imgs = base.images ?? [];
          if (imgs.length) {
            const validImgs = imgs
              .filter((img) => !!img?.url)
              .map((img) => ({
                appointmentId: created.id,
                url: img.url,
                fileKey: img.fileKey ?? null,
              }));

            if (validImgs.length) {
              await tx.appointmentImage.createMany({ data: validImgs });
            }
          }

          cursor =
            rec.frequency === "weekly"
              ? cursor.plus({ weeks: rec.interval })
              : cursor.plus({ months: rec.interval });

          count++;
          if (count > 10_000) {
            throw new Error("Recurrence too large; aborting for safety");
          }
        }
      }

      return tx.job.findUnique({
        where: { id: job.id },
        include: {
          client: true,
          address: true,
          lineItems: true,
          recurrence: true,
          notes: {
            include: {
              images: true,
              createdBy: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
          },
          appointments: {
            include: {
              assignments: {
                include: {
                  staff: {
                    select: { id: true, name: true, email: true, role: true },
                  },
                },
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
