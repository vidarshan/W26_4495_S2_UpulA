export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";

function parseDateParam(value: string | null) {
  if (!value) return null;
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? DateTime.fromFormat(value, "yyyy-LL-dd", { zone: APP_TZ })
    : DateTime.fromISO(value, { zone: "utc" }).setZone(APP_TZ);
  return dt.isValid ? dt : null;
}

function addDays(date: DateTime, days: number) {
  return date.plus({ days });
}

function toDateKey(date: DateTime) {
  return date.setZone(APP_TZ).toFormat("yyyy-LL-dd");
}

function overlapMinutes(rangeStart: Date, rangeEnd: Date, segStart: Date, segEnd: Date) {
  const start = Math.max(rangeStart.getTime(), segStart.getTime());
  const end = Math.min(rangeEnd.getTime(), segEnd.getTime());
  if (end <= start) return 0;
  return Math.round((end - start) / 60000);
}

function splitAssignmentAcrossDays(
  startedAt: Date,
  endedAt: Date,
  periodStart: Date,
  periodEndExclusive: Date,
) {
  const result: { dateKey: string; minutes: number }[] = [];

  const clippedStart = new Date(Math.max(startedAt.getTime(), periodStart.getTime()));
  const clippedEnd = new Date(Math.min(endedAt.getTime(), periodEndExclusive.getTime()));

  if (clippedEnd <= clippedStart) return result;

  let cursor = DateTime.fromJSDate(clippedStart, { zone: APP_TZ }).startOf("day");
  const lastDay = DateTime.fromJSDate(
    new Date(clippedEnd.getTime() - 1),
    { zone: APP_TZ },
  ).startOf("day");

  while (cursor <= lastDay) {
    const dayStart = cursor.startOf("day");
    const dayEndExclusive = addDays(dayStart, 1);

    const minutes = overlapMinutes(
      clippedStart,
      clippedEnd,
      dayStart.toJSDate(),
      dayEndExclusive.toJSDate(),
    );

    if (minutes > 0) {
      result.push({
        dateKey: toDateKey(dayStart),
        minutes,
      });
    }

    cursor = addDays(cursor, 1);
  }

  return result;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const startDate = parseDateParam(startDateParam);
    const endDate = parseDateParam(endDateParam);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Invalid startDate or endDate" },
        { status: 400 }
      );
    }

    const periodStart = startDate.startOf("day").toJSDate();
    const periodEndExclusive = endDate.startOf("day").plus({ days: 1 }).toJSDate();

    const assignments = await prisma.assignment.findMany({
      where: {
        staffId: session.user.id,
        plannedStart: {
          lt: periodEndExclusive,
        },
        plannedEnd: { not: null, gte: periodStart },
      },
      select: {
        plannedStart: true,
        plannedEnd: true,
        breakMinutes: true,
      },
      orderBy: {
        plannedStart: "asc",
      },
    });

    const dailyTotals: Record<string, number> = {};

    for (const a of assignments) {
      if (!a.plannedStart || !a.plannedEnd) continue;

      const start = new Date(a.plannedStart);
      const end = new Date(a.plannedEnd);

      const split = splitAssignmentAcrossDays(
        start,
        end,
        periodStart,
        periodEndExclusive,
      );

      let remainingBreakMinutes = Math.max(a.breakMinutes ?? 0, 0);

      for (const part of split) {
        const breakForPart = Math.min(remainingBreakMinutes, part.minutes);
        const minutesWorked = Math.max(part.minutes - breakForPart, 0);
        remainingBreakMinutes -= breakForPart;

        dailyTotals[part.dateKey] = (dailyTotals[part.dateKey] ?? 0) + minutesWorked;
      }
    }

    return NextResponse.json({
      dailyTotals,
      assignmentCount: assignments.length,
    });

  } catch (error) {
    console.error("GET /api/staff/time-sheet failed:", error);

    return NextResponse.json(
      { error: "Failed to load time logs" },
      { status: 500 }
    );
  }
}
