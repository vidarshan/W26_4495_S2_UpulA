import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ timesheetId: string }> }
) {
  try {
    // 🔐 1. Auth
    const token = await getToken({ req });

    if (!token || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = token.id as string;

    // ✅ FIX: await params
    const { timesheetId } = await context.params;

    if (!timesheetId) {
      return NextResponse.json(
        { error: "Missing timesheetId" },
        { status: 400 }
      );
    }

    console.log("Approving timesheet:", timesheetId);

    // 📦 2. Fetch
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        staff: {
          include: {
            staffProfile: true,
          },
        },
        days: true,
      },
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    if (timesheet.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Only submitted timesheets can be approved" },
        { status: 400 }
      );
    }

    // 🧠 3. Calculate totals
    let totalMinutes = 0;
    let totalPay = 0;

    const snapshotDays = timesheet.days.map((day) => {
      const minutes = day.minutesWorked ?? 0;

      const rate =
        day.hourlyRate ??
        timesheet.staff.staffProfile?.hourlyRate ??
        0;

      const pay = (minutes / 60) * rate;

      totalMinutes += minutes;
      totalPay += pay;

      return {
        date: day.workDate,
        minutes,
        rate,
        pay,
        notes: day.notes ?? null,
      };
    });

    const snapshot = {
      staffId: timesheet.staffId,
      staffName: timesheet.staff.name,
      periodId: timesheet.periodId,
      approvedAt: new Date(),

      totalMinutes,
      totalHours: totalMinutes / 60,
      totalPay,

      days: snapshotDays,
    };

    // 🔒 4. Update (FIXED RELATION HERE)
    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),

        approvedBy: {
          connect: { id: adminId }, // ✅ FIX HERE
        },

        // isLocked: true,
        snapshot,
        totalMinutes,
        totalPay,
      },
    });

    // 📤 5. Response
    return NextResponse.json({
      message: "Timesheet approved successfully",
      timesheet: updatedTimesheet,
      snapshot,
    });

  } catch (error) {
    console.error("APPROVE TIMESHEET ERROR:", error);

    return NextResponse.json(
      { error: "Failed to approve timesheet" },
      { status: 500 }
    );
  }
}