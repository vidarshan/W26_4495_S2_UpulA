// app/api/admin/timesheets/[timesheetId]/approve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function POST(
  req: NextRequest,
  { params }: { params: { timesheetId: string } }
) {
  try {
    // 🔐 1. Auth check (JWT)
    const token = await getToken({ req });

    if (!token || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = token.id as string;
    const { timesheetId } = params;

    // 📦 2. Fetch timesheet
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
      const minutes = day.minutesWorked;

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
        notes: day.notes,
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

    // 🔒 4. Approve + lock
    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: adminId,
        isLocked: true,
        snapshot,
        totalMinutes,
        totalPay,
      },
    });

    // 📤 5. Return response (important for payroll step)
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