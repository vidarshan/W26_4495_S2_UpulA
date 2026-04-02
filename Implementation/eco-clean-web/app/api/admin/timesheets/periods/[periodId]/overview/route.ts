import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export const runtime = "nodejs";

const APP_TZ = "America/Vancouver";

function toDayKey(date: Date) {
  return DateTime.fromJSDate(date).setZone(APP_TZ).toFormat("yyyy-LL-dd");
}

function getPlannedMinutes(
  plannedStart: Date | null,
  plannedEnd: Date | null,
  breakMinutes: number
) {
  if (!plannedStart || !plannedEnd) return 0;

  const diff = Math.round(
    DateTime.fromJSDate(plannedEnd)
      .diff(DateTime.fromJSDate(plannedStart), "minutes")
      .minutes
  );

  return Math.max(0, diff - (breakMinutes || 0));
}

type RouteContext = {
  params: Promise<{ periodId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const session = await getAuthSession();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { periodId } = await context.params;

    // 🔹 Fetch period
    const period = await prisma.timesheetPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Timesheet period not found" },
        { status: 404 }
      );
    }

    const periodStart = period.startDate;
    const periodEndExclusive = DateTime.fromJSDate(period.endDate)
      .plus({ days: 1 })
      .startOf("day")
      .toJSDate();

    // 🔹 Fetch data
    const [timesheets, assignments] = await Promise.all([
      prisma.timesheet.findMany({
        where: { periodId },
        include: {
          staff: {
            include: {
              staffProfile: true,
            },
          },
          days: true,
        },
      }),

      prisma.assignment.findMany({
        where: {
          OR: [
            {
              plannedStart: {
                gte: periodStart,
                lt: periodEndExclusive,
              },
            },
            {
              plannedEnd: {
                gte: periodStart,
                lt: periodEndExclusive,
              },
            },
          ],
        },
        include: {
          staff: {
            include: {
              staffProfile: true,
            },
          },
          appointment: {
            include: {
              job: {
                include: {
                  client: true,
                  address: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // ======================================================
    // ✅ STEP 1: Build employees from TIMESHEETS ONLY
    // ======================================================

    const employees = timesheets.map((ts) => {
      const daysMap: Record<string, any> = {};

      // Add actual work
      for (const day of ts.days) {
        const key = toDayKey(day.workDate);

        daysMap[key] = {
          date: key,
          actualMinutes: day.minutesWorked,
          plannedMinutes: 0,
          varianceMinutes: 0,
          timesheetDayId: day.id,
          hourlyRate: day.hourlyRate,
          notes: day.notes,
          assignments: [],
        };
      }

      return {
        staffId: ts.staffId,
        name: ts.staff.name,
        email: ts.staff.email,
        staffCode: ts.staff.staffProfile?.staffId ?? null,
        position: ts.staff.staffProfile?.position ?? null,
        timesheetId: ts.id,
        timesheetStatus: ts.status,
        submittedAt: ts.submittedAt,
        approvedAt: ts.approvedAt,
        notes: ts.notes,
        daysMap,
      };
    });

    // ======================================================
    // ✅ STEP 2: Attach assignments
    // ======================================================

    for (const assignment of assignments) {
      const emp = employees.find(
        (e) => e.staffId === assignment.staffId
      );

      if (!emp) continue; // ignore if no timesheet

      const baseDate =
        assignment.plannedStart ||
        assignment.plannedEnd ||
        assignment.appointment.startTime;

      const key = toDayKey(baseDate);

      if (!emp.daysMap[key]) {
        emp.daysMap[key] = {
          date: key,
          actualMinutes: 0,
          plannedMinutes: 0,
          varianceMinutes: 0,
          timesheetDayId: null,
          hourlyRate: null,
          notes: null,
          assignments: [],
        };
      }

      const plannedMinutes = getPlannedMinutes(
        assignment.plannedStart,
        assignment.plannedEnd,
        assignment.breakMinutes
      );

      emp.daysMap[key].plannedMinutes += plannedMinutes;

      emp.daysMap[key].assignments.push({
        id: assignment.id,
        jobTitle: assignment.appointment.job.title,
        clientName:
          assignment.appointment.job.client.companyName ||
          `${assignment.appointment.job.client.firstName} ${assignment.appointment.job.client.lastName}`,
        status: assignment.status,
        plannedMinutes,
      });
    }

    // ======================================================
    // ✅ STEP 3: Final transformation
    // ======================================================

    const result = employees.map((emp) => {
      const days = Object.values(emp.daysMap)
        .sort((a: any, b: any) => a.date.localeCompare(b.date))
        .map((d: any) => {
          const variance = d.actualMinutes - d.plannedMinutes;

          return {
            ...d,
            varianceMinutes: variance,
          };
        });

      const plannedMinutes = days.reduce(
        (sum: number, d: any) => sum + d.plannedMinutes,
        0
      );

      const actualMinutes = days.reduce(
        (sum: number, d: any) => sum + d.actualMinutes,
        0
      );

      return {
        ...emp,
        days,
        totals: {
          plannedMinutes,
          actualMinutes,
          varianceMinutes: actualMinutes - plannedMinutes,
        },
      };
    });

    return NextResponse.json({
      period,
      employees: result.sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    });
  } catch (error) {
    console.error("Admin Timesheet Error:", error);

    return NextResponse.json(
      { error: "Failed to load timesheets" },
      { status: 500 }
    );
  }
}