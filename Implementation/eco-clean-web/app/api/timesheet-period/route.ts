export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { NextResponse } from "next/server";

/**
 * GET: List all timesheet periods
 */
export async function GET(req: Request) {
//   const session = await getAuthSession();
//   if (!session || session.user.role !== "ADMIN") {
//     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//   }

  try {
    const periods = await prisma.timesheetPeriod.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { entries: true } // Shows how many entries are in this period
        }
      }
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error("GET TimesheetPeriod failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST: Create a new payroll period
 */
export async function POST(req: Request) {
//   const session = await getAuthSession();
//   if (!session || session.user.role !== "ADMIN") {
//     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//   }

  try {
    const body = await req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });
    }

    // Optional: Check if a period with overlapping dates already exists
    const overlap = await prisma.timesheetPeriod.findFirst({
      where: {
        OR: [
          { startDate: { lte: new Date(endDate) }, endDate: { gte: new Date(startDate) } }
        ]
      }
    });

    if (overlap) {
      return NextResponse.json({ error: "This date range overlaps with an existing period." }, { status: 400 });
    }

    const period = await prisma.timesheetPeriod.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "OPEN"
      }
    });

    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error("POST TimesheetPeriod failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH: Update status or lock a period
 */
export async function PATCH(req: Request) {
//   const session = await getAuthSession();
//   if (!session || session.user.role !== "ADMIN") {
//     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//   }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "ID and Status are required" }, { status: 400 });
    }

    const updated = await prisma.timesheetPeriod.update({
      where: { id },
      data: {
        status,
        ...(status === "LOCKED" && { lockedAt: new Date() })
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH TimesheetPeriod failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
