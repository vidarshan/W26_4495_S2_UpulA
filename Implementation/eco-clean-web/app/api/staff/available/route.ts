export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";

/**
 * GET /api/staff/available?date=YYYY-MM-DD&startTime=HH:mm&endTime=HH:mm
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const date = searchParams.get("date");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Convert date properly
    const dateTime = DateTime.fromISO(date, { zone: APP_TZ });

    if (!dateTime.isValid) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const jsDate = dateTime.toJSDate();

    // Get weekday (mon, tue, etc.)
    const day = dateTime.toFormat("ccc").toLowerCase(); // mon, tue...

    const toTotalMinutes = (value: string) => {
      const [hour, minute] = value.split(":").map(Number);

      if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
      ) {
        return null;
      }

      return hour * 60 + minute;
    };

    const startMinutes = toTotalMinutes(startTime);
    const endMinutes = toTotalMinutes(endTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: "Invalid time range" },
        { status: 400 }
      );
    }

    const SHIFT_1_START = 3 * 60;
    const SHIFT_1_END = 12 * 60;
    const SHIFT_2_START = 12 * 60;
    const SHIFT_2_END = 22 * 60;

    if (startMinutes < SHIFT_1_START || endMinutes > SHIFT_2_END) {
      return NextResponse.json(
        { error: "Time outside supported shifts (03:00–22:00)" },
        { status: 400 }
      );
    }

    const requiredShifts: Array<"S1" | "S2"> = [];

    if (startMinutes < SHIFT_1_END && endMinutes > SHIFT_1_START) {
      requiredShifts.push("S1");
    }

    if (startMinutes < SHIFT_2_END && endMinutes > SHIFT_2_START) {
      requiredShifts.push("S2");
    }

    if (!requiredShifts.length) {
      return NextResponse.json(
        { error: "Time outside supported shifts (03:00–22:00)" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------
    // 1. Get ALL relevant availability records
    // ---------------------------------------------------
    const availabilities = await prisma.staffAvailability.findMany({
      where: {
        effectiveFrom: {
          lte: jsDate,
        },
      },
      orderBy: {
        effectiveFrom: "desc",
      },
      include: {
        staffProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    // ---------------------------------------------------
    // 2. Pick LATEST availability per staff
    // ---------------------------------------------------
    const latestMap = new Map<string, (typeof availabilities)[0]>();

    for (const a of availabilities) {
      if (!latestMap.has(a.staffProfileId)) {
        latestMap.set(a.staffProfileId, a);
      }
    }

    const latestAvailabilities = Array.from(latestMap.values());

    // ---------------------------------------------------
    // 3. Filter by availability (day + shift)
    // ---------------------------------------------------
    const availableStaff = latestAvailabilities.filter((a) => {
      const isActive = a[`${day}Active` as keyof typeof a];
      const supportsAllShifts = requiredShifts.every((shift) =>
        Boolean(a[`${day}${shift}` as keyof typeof a])
      );

      return Boolean(isActive && supportsAllShifts);
    });

    // ---------------------------------------------------
    // 4. Get approved leave
    // ---------------------------------------------------
    const leaves = await prisma.leave.findMany({
      where: {
        status: "APPROVED",
        startAt: { lte: jsDate },
        endAt: { gte: jsDate },
      },
    });

    const leaveStaffIds = new Set(leaves.map((l) => l.staffId));

    // ---------------------------------------------------
    // 5. Remove staff on leave
    // ---------------------------------------------------
    const finalStaff = availableStaff.filter((a) => {
      const userId = a.staffProfile.userId;
      return !leaveStaffIds.has(userId) && !a.staffProfile.user.deletedAt;
    });

    // ---------------------------------------------------
    // 6. Return clean response
    // ---------------------------------------------------
    const response = finalStaff.map((a) => ({
      id: a.staffProfile.user.id,
      name:
        a.staffProfile.user.name ||
        a.staffProfile.user.email ||
        "Unnamed staff",
      email: a.staffProfile.user.email,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET available staff failed:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
