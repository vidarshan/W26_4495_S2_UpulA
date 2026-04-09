export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { LineItem } from "@/lib/api/jobs";
import { NextRequest, NextResponse } from "next/server";
import { parseAppDateTimeInput } from "@/lib/dateTime";
import { getAuthSession } from "@/lib/session";

function must(condition: unknown, msg: string) {
  if (!condition) throw new Error(msg);
}

function mustString(v: unknown, msg: string) {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(msg);
  return v.trim();
}

function normalizeLineItems(rawLineItems: unknown, jobId: string) {
  if (!Array.isArray(rawLineItems)) return [];

  return rawLineItems
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
      const quantity = Math.trunc(Number(li.quantity));
      const unitCost =
        typeof li.unitCost === "number" && Number.isFinite(li.unitCost)
          ? li.unitCost
          : null;
      const unitPrice =
        typeof li.unitPrice === "number" && Number.isFinite(li.unitPrice)
          ? li.unitPrice
          : null;

      return {
        jobId,
        name: li.name.trim(),
        quantity,
        unitCost,
        unitPrice,
        total: unitPrice != null ? quantity * unitPrice : null,
        description: li.description?.trim() || null,
      };
    });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAuthSession();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        client: true,
        address: true,
        appointments: {
          include: {
            assignments: {
              include: {
                staff: true,
              },
            },
            notes: true,
            images: true,
          },
          orderBy: { startTime: "asc" },
        },
        lineItems: true,
        notes: {
          include: {
            images: true,
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        },
        recurrence: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (err) {
    console.error("GET /api/jobs/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAuthSession();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: jobId } = await context.params;
    const raw = await req.text();

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
    } catch {
      parsed = raw;
    }

    if (parsed === "CANCEL_JOBS") {
      const updated = await prisma.appointment.updateMany({
        where: { jobId },
        data: { status: "CANCELLED" },
      });

      if (updated.count === 0) {
        return NextResponse.json(
          { success: false, message: "No appointments found for this job" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        cancelledAppointments: updated.count,
      });
    }

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const body = parsed as Record<string, unknown>;
    const title = mustString(body.title, "Missing title");
    const clientId = mustString(body.clientId, "Missing clientId");
    const addressId = mustString(body.addressId, "Missing addressId");
    const isAnytime = !!body.isAnytime;
    const recurrenceBody =
      body.recurrence && typeof body.recurrence === "object"
        ? (body.recurrence as Record<string, unknown>)
        : null;
    const lineItems = normalizeLineItems(body.lineItems, jobId);

    must(lineItems.length > 0, "At least one valid line item is required");

    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        clientId,
      },
      select: { id: true },
    });

    if (!address) {
      return NextResponse.json(
        { error: "Address does not belong to the selected client" },
        { status: 400 },
      );
    }

    const updatedJob = await prisma.$transaction(async (tx) => {
      const existing = await tx.job.findUnique({
        where: { id: jobId },
        select: { id: true, type: true },
      });

      if (!existing) {
        throw new Error("Job not found");
      }

      if (existing.type === "RECURRING") {
        if (!recurrenceBody) {
          throw new Error("Recurring jobs require recurrence settings");
        }

        const recurrence = recurrenceBody;
        must(
          recurrence.frequency === "weekly" || recurrence.frequency === "monthly",
          "Invalid recurrence frequency",
        );
        must(
          typeof recurrence.interval === "number" && recurrence.interval >= 1,
          "recurrence.interval must be >= 1",
        );
        must(
          recurrence.endType === "after" || recurrence.endType === "on",
          "Invalid recurrence endType",
        );

        if (recurrence.endType === "after") {
          must(
            typeof recurrence.endsAfter === "number" && recurrence.endsAfter >= 1,
            "recurrence.endsAfter must be >= 1",
          );
        }

        if (recurrence.endType === "on") {
          must(
            typeof recurrence.endsOn === "string" &&
              recurrence.endsOn.trim().length > 0,
            "recurrence.endsOn is required",
          );
        }
      }

      await tx.job.update({
        where: { id: jobId },
        data: {
          title,
          clientId,
          addressId,
          isAnytime,
          visitInstructions:
            typeof body.visitInstructions === "string" &&
            body.visitInstructions.trim().length > 0
              ? body.visitInstructions.trim()
              : null,
        },
      });

      await tx.jobLineItem.deleteMany({ where: { jobId } });
      await tx.jobLineItem.createMany({ data: lineItems });

      if (existing.type === "RECURRING" && recurrenceBody) {
        const endsOn =
          recurrenceBody.endType === "on" &&
          typeof recurrenceBody.endsOn === "string"
            ? parseAppDateTimeInput(recurrenceBody.endsOn)
            : null;

        if (recurrenceBody.endType === "on" && !endsOn) {
          throw new Error("Invalid recurrence.endsOn");
        }

        await tx.recurrence.upsert({
          where: { jobId },
          update: {
            frequency: recurrenceBody.frequency as string,
            interval: recurrenceBody.interval as number,
            endType: recurrenceBody.endType as string,
            endsAfter:
              recurrenceBody.endType === "after"
                ? ((recurrenceBody.endsAfter as number | null | undefined) ??
                  null)
                : null,
            endsOn,
          },
          create: {
            jobId,
            frequency: recurrenceBody.frequency as string,
            interval: recurrenceBody.interval as number,
            endType: recurrenceBody.endType as string,
            endsAfter:
              recurrenceBody.endType === "after"
                ? ((recurrenceBody.endsAfter as number | null | undefined) ??
                  null)
                : null,
            endsOn,
          },
        });
      }

      return tx.job.findUnique({
        where: { id: jobId },
        include: {
          client: true,
          address: true,
          appointments: {
            include: {
              assignments: {
                include: {
                  staff: true,
                },
              },
              notes: true,
              images: true,
            },
            orderBy: { startTime: "asc" },
          },
          lineItems: true,
          notes: {
            include: {
              images: true,
              createdBy: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
          },
          recurrence: true,
        },
      });
    });

    return NextResponse.json(updatedJob);
  } catch (err) {
    console.error("PATCH /api/jobs/[id] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
