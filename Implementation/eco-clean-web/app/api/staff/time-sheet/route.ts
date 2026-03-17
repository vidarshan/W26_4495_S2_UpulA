export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

    const startDate = startOfDay(new Date(startDateParam));
    const endDate = endOfDay(new Date(endDateParam));

    const assignments = await prisma.assignment.findMany({
      where: {
        staffId: session.user.id,
        plannedStart: {
          gte: startDate,
          lte: endDate,
        },
        plannedEnd: {
          not: null,
        },
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

      let minutesWorked = Math.round(
        (end.getTime() - start.getTime()) / 60000
      );

      minutesWorked -= a.breakMinutes ?? 0;

      if (minutesWorked < 0) minutesWorked = 0;

      const key = dateKey(start);

      dailyTotals[key] = (dailyTotals[key] ?? 0) + minutesWorked;
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
