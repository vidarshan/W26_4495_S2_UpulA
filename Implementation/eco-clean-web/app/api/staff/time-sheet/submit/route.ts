import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { TimesheetStatus, TimesheetPeriodStatus } from "@prisma/client";

type SubmitBody = {
  periodId?: string;
  notes?: string | null;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function overlapMinutes(
  rangeStart: Date,
  rangeEnd: Date,
  segStart: Date,
  segEnd: Date,
) {
  const start = Math.max(rangeStart.getTime(), segStart.getTime());
  const end = Math.min(rangeEnd.getTime(), segEnd.getTime());

  if (end <= start) return 0;

  return Math.round((end - start) / 60000);
}

function splitSessionAcrossDays(
  startedAt: Date,
  endedAt: Date,
  periodStart: Date,
  periodEndExclusive: Date,
) {
  const result: { dateKey: string; minutes: number }[] = [];

  const clippedStart = new Date(
    Math.max(startedAt.getTime(), periodStart.getTime()),
  );
  const clippedEnd = new Date(
    Math.min(endedAt.getTime(), periodEndExclusive.getTime()),
  );

  if (clippedEnd <= clippedStart) {
    return result;
  }

  let cursor = startOfDay(clippedStart);
  const lastDay = startOfDay(new Date(clippedEnd.getTime() - 1));

  while (cursor <= lastDay) {
    const dayStart = startOfDay(cursor);
    const dayEndExclusive = addDays(dayStart, 1);

    const minutes = overlapMinutes(
      clippedStart,
      clippedEnd,
      dayStart,
      dayEndExclusive,
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

export async function POST(req: NextRequest) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SubmitBody;
    const periodId = body.periodId?.trim();
    const notes = body.notes?.trim() || null;

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required" },
        { status: 400 },
      );
    }

    const staffId = session.user.id;

    const period = await prisma.timesheetPeriod.findUnique({
      where: { id: periodId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Timesheet period not found" },
        { status: 404 },
      );
    }

    if (period.status === TimesheetPeriodStatus.LOCKED) {
      return NextResponse.json(
        { error: "This timesheet period is locked" },
        { status: 400 },
      );
    }

    const periodStart = startOfDay(new Date(period.startDate));
    const periodEndExclusive = addDays(startOfDay(new Date(period.endDate)), 1);

    const workSessions = await prisma.appointmentWorkSession.findMany({
      where: {
        staffId,
        startedAt: {
          lt: periodEndExclusive,
        },
        OR: [
          {
            endedAt: {
              gte: periodStart,
            },
          },
          {
            endedAt: null,
          },
        ],
      },
      orderBy: {
        startedAt: "asc",
      },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
      },
    });

    const staffProfile = await prisma.staffProfile.findUnique({
      where: {
        userId: staffId,
      },
      select: {
        hourlyRate: true,
      },
    });

    const hourlyRate = staffProfile?.hourlyRate ?? 0;
    const now = new Date();

    const dailyTotals = new Map<string, number>();

    for (const ws of workSessions) {
      const actualStart = new Date(ws.startedAt);
      const actualEnd = ws.endedAt ? new Date(ws.endedAt) : now;

      if (actualEnd <= actualStart) continue;

      const split = splitSessionAcrossDays(
        actualStart,
        actualEnd,
        periodStart,
        periodEndExclusive,
      );

      for (const part of split) {
        dailyTotals.set(
          part.dateKey,
          (dailyTotals.get(part.dateKey) ?? 0) + part.minutes,
        );
      }
    }

    const dayRows = Array.from(dailyTotals.entries())
      .filter(([, minutesWorked]) => minutesWorked > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, minutesWorked]) => ({
        workDate: fromDateKey(dateKey),
        minutesWorked,
        hourlyRate,
        notes: null as string | null,
      }));

    const result = await prisma.$transaction(async (tx) => {
      const timesheet = await tx.timesheet.upsert({
        where: {
          periodId_staffId: {
            periodId,
            staffId,
          },
        },
        update: {
          status: TimesheetStatus.SUBMITTED,
          submittedAt: new Date(),
          approvedAt: null,
          approvedById: null,
          notes,
        },
        create: {
          periodId,
          staffId,
          status: TimesheetStatus.SUBMITTED,
          submittedAt: new Date(),
          notes,
        },
        select: {
          id: true,
          periodId: true,
          staffId: true,
          status: true,
          submittedAt: true,
        },
      });

      await tx.timesheetDay.deleteMany({
        where: {
          timesheetId: timesheet.id,
        },
      });

      if (dayRows.length > 0) {
        await tx.timesheetDay.createMany({
          data: dayRows.map((row) => ({
            timesheetId: timesheet.id,
            workDate: row.workDate,
            minutesWorked: row.minutesWorked,
            hourlyRate: row.hourlyRate,
            notes: row.notes,
          })),
        });
      }

      const savedDays = await tx.timesheetDay.findMany({
        where: {
          timesheetId: timesheet.id,
        },
        orderBy: {
          workDate: "asc",
        },
        select: {
          id: true,
          workDate: true,
          minutesWorked: true,
          hourlyRate: true,
          notes: true,
        },
      });

      return {
        timesheet,
        savedDays,
      };
    });

    return NextResponse.json({
      success: true,
      timesheet: result.timesheet,
      days: result.savedDays,
      summary: {
        daysCount: result.savedDays.length,
        totalMinutes: result.savedDays.reduce(
          (sum, d) => sum + d.minutesWorked,
          0,
        ),
      },
    });
  } catch (error) {
    console.error("POST /api/staff/time-sheet/submit failed:", error);

    return NextResponse.json(
      { error: "Failed to submit timesheet" },
      { status: 500 },
    );
  }
}
