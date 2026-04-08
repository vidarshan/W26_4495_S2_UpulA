import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";

type SessionRow = {
  id: string;
  appointmentId: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  appointment: {
    id: string;
    startTime: string;
    endTime: string;
    job: {
      id: string;
      title: string;
      client: {
        firstName: string;
        lastName: string;
        companyName: string | null;
      };
    };
  };
};

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

function formatClientName(client: {
  firstName: string;
  lastName: string;
  companyName: string | null;
}) {
  if (client.companyName?.trim()) return client.companyName;
  return `${client.firstName} ${client.lastName}`.trim();
}

function overlapMinutes(rangeStart: Date, rangeEnd: Date, segStart: Date, segEnd: Date) {
  const start = Math.max(rangeStart.getTime(), segStart.getTime());
  const end = Math.min(rangeEnd.getTime(), segEnd.getTime());
  if (end <= start) return 0;
  return Math.round((end - start) / 60000);
}

function splitSessionAcrossDays(
  startedAt: Date,
  endedAt: Date,
  periodStart: Date,
  periodEnd: Date,
) {
  const result: { dateKey: string; minutes: number }[] = [];

  const clippedStart = new Date(Math.max(startedAt.getTime(), periodStart.getTime()));
  const clippedEnd = new Date(Math.min(endedAt.getTime(), periodEnd.getTime()));

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
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = parseDateParam(searchParams.get("startDate"));
  const endDate = parseDateParam(searchParams.get("endDate"));

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const periodStart = startDate.startOf("day").toJSDate();
  const periodEndExclusive = endDate.startOf("day").plus({ days: 1 }).toJSDate();

  try {
    const workSessions = await prisma.appointmentWorkSession.findMany({
      where: {
        staffId: session.user.id,
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
      include: {
        appointment: {
          include: {
            job: {
              include: {
                client: {
                  select: {
                    firstName: true,
                    lastName: true,
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        startedAt: "asc",
      },
    });

    const now = new Date();

    const dailyTotals: Record<string, number> = {};
    const dailySessions: Record<
      string,
      {
        id: string;
        appointmentId: string;
        startedAt: string;
        endedAt: string | null;
        jobTitle: string;
        clientName: string;
        minutesForDay: number;
      }[]
    > = {};

    for (const ws of workSessions as unknown as SessionRow[]) {
      const actualStart = new Date(ws.startedAt);
      const actualEnd = ws.endedAt ? new Date(ws.endedAt) : now;

      const split = splitSessionAcrossDays(
        actualStart,
        actualEnd,
        periodStart,
        periodEndExclusive
      );

      for (const part of split) {
        dailyTotals[part.dateKey] = (dailyTotals[part.dateKey] ?? 0) + part.minutes;

        if (!dailySessions[part.dateKey]) {
          dailySessions[part.dateKey] = [];
        }

        dailySessions[part.dateKey].push({
          id: ws.id,
          appointmentId: ws.appointmentId,
          startedAt: ws.startedAt,
          endedAt: ws.endedAt,
          jobTitle: ws.appointment.job.title,
          clientName: formatClientName(ws.appointment.job.client),
          minutesForDay: part.minutes,
        });
      }
    }

    return NextResponse.json({
      dailyTotals,
      dailySessions,
    });
  } catch (error) {
    console.error("GET /api/staff/time-sheet failed:", error);
    return NextResponse.json(
      { error: "Failed to load timesheet data" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const sessionId = String(body.sessionId ?? "");
    const startedAtRaw = body.startedAt;
    const endedAtRaw = body.endedAt;

    if (!sessionId || !startedAtRaw) {
      return NextResponse.json(
        { error: "sessionId and startedAt are required" },
        { status: 400 }
      );
    }

    const startedAt = new Date(startedAtRaw);
    const endedAt = endedAtRaw ? new Date(endedAtRaw) : null;

    if (Number.isNaN(startedAt.getTime())) {
      return NextResponse.json({ error: "Invalid startedAt" }, { status: 400 });
    }

    if (endedAtRaw && (!endedAt || Number.isNaN(endedAt.getTime()))) {
      return NextResponse.json({ error: "Invalid endedAt" }, { status: 400 });
    }

    if (endedAt && endedAt <= startedAt) {
      return NextResponse.json(
        { error: "endedAt must be later than startedAt" },
        { status: 400 }
      );
    }

    const existing = await prisma.appointmentWorkSession.findFirst({
      where: {
        id: sessionId,
        staffId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Work session not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.appointmentWorkSession.update({
      where: { id: sessionId },
      data: {
        startedAt,
        endedAt,
      },
    });

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (error) {
    console.error("PATCH /api/staff/time-sheet failed:", error);
    return NextResponse.json(
      { error: "Failed to update work session" },
      { status: 500 }
    );
  }
}
