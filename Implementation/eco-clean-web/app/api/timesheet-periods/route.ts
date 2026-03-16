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
        startDate: "asc"
      },
      include: {
        // Includes a count of related entries to show activity in the UI
        _count: {
          select: { entries: true }
        }
      }
    });

    // Return the array of periods directly
    return NextResponse.json(periods);
  } catch (error) {
    console.error("GET TimesheetPeriod failed:", error);

    // Standard error response for Douglas College project guidelines
    return NextResponse.json(
      { error: "Internal server error: Failed to fetch periods." },
      { status: 500 }
    );
  }
}
