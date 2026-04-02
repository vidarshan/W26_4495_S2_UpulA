import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const periods = await prisma.timesheetPeriod.findMany({
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
        lockedAt: true,
      },
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error("GET /api/admin/timesheets/periods error:", error);
    return NextResponse.json(
      { error: "Failed to load timesheet periods" },
      { status: 500 }
    );
  }
}
