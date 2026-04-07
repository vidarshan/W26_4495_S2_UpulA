export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET: Fetch all timesheet periods for the Admin Dashboard.
 * Sorted by startDate (ASC) to ensure chronological indexing in the frontend.
 */
export async function GET(req: Request) {
  try {
    const periods = await prisma.timesheetPeriod.findMany({
      orderBy: {
        startDate: "asc",
      },
      include: {
        _count: {
          select: { timesheets: true },
        },
      },
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error("GET TimesheetPeriod failed:", error);
    return NextResponse.json(
      { error: "Internal server error: Failed to fetch periods." },
      { status: 500 }
    );
  }
}