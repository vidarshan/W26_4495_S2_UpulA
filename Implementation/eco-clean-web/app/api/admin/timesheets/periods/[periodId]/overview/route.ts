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
    DateTime.fromJSDate(plannedEnd).diff(
      DateTime.fromJSDate(plannedStart),
      "minutes"
    ).minutes
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

    const period = await prisma.timesheetPeriod.findUnique({
      where: { id: periodId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
        lockedAt: true,
      },
    });

    if (!period) {
      return NextResponse.json({ error: "Timesheet period not found" }, { status: 404 });
    }

    const periodStart = period.startDate;
    const periodEndExclusive = DateTime.fromJSDate(period.endDate)
      .plus({ days: 1 })
      .startOf("day")
      .toJSDate();

    const [timesheets, assignments] = await Promise.all([
      prisma.timesheet.findMany({
        where: {
          periodId,
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          approvedAt: true,
          notes: true,
          staffId: true,
          staff: {
            select: {
              id: true,
              name: true,
              email: true,
              staffProfile: {
                select: {
                  staffId: true,
                  position: true,
                  hourlyRate: true,
                },
              },
            },
          },
          days: {
            orderBy: { workDate: "asc" },
            select: {
              id: true,
              workDate: true,
              minutesWorked: true,
              hourlyRate: true,
              notes: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          staff: {
            name: "asc",
          },
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
        select: {
          id: true,
          staffId: true,
          status: true,
          plannedStart: true,
          plannedEnd: true,
          breakMinutes: true,
          hourlyRateAtTime: true,
          notes: true,
          appointmentId: true,
          appointment: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
              job: {
                select: {
                  id: true,
                  title: true,
                  client: {
                    select: {
                      firstName: true,
                      lastName: true,
                      companyName: true,
                    },
                  },
                  address: {
                    select: {
                      street1: true,
                      city: true,
                      province: true,
                    },
                  },
                },
              },
            },
          },
          staff: {
            select: {
              id: true,
              name: true,
              email: true,
              staffProfile: {
                select: {
                  staffId: true,
                  position: true,
                  hourlyRate: true,
                },
              },
            },
          },
        },
        orderBy: [{ staff: { name: "asc" } }, { plannedStart: "asc" }],
      }),
    ]);

    const employeeMap = new Map<
      string,
      {
        staffId: string;
        name: string;
        email: string;
        staffCode: string | null;
        position: string | null;
        timesheetId: string | null;
        timesheetStatus: string | null;
        submittedAt: Date | null;
        approvedAt: Date | null;
        notes: string | null;
        totals: {
          plannedMinutes: number;
          actualMinutes: number;
          varianceMinutes: number;
        };
        daysMap: Map<
          string,
          {
            date: string;
            actualMinutes: number;
            plannedMinutes: number;
            varianceMinutes: number;
            timesheetDayId: string | null;
            hourlyRate: number | null;
            notes: string | null;
            assignments: Array<{
              id: string;
              appointmentId: string;
              jobTitle: string;
              clientName: string;
              addressLine: string;
              status: string;
              plannedStart: Date | null;
              plannedEnd: Date | null;
              breakMinutes: number;
              plannedMinutes: number;
              hourlyRateAtTime: number;
              notes: string | null;
            }>;
          }
        >;
      }
    >();

    function ensureEmployee(args: {
      staffId: string;
      name: string;
      email: string;
      staffCode: string | null;
      position: string | null;
      timesheetId?: string | null;
      timesheetStatus?: string | null;
      submittedAt?: Date | null;
      approvedAt?: Date | null;
      notes?: string | null;
    }) {
      const existing = employeeMap.get(args.staffId);

      if (existing) {
        if (args.timesheetId) existing.timesheetId = args.timesheetId;
        if (args.timesheetStatus) existing.timesheetStatus = args.timesheetStatus;
        if (args.submittedAt) existing.submittedAt = args.submittedAt;
        if (args.approvedAt) existing.approvedAt = args.approvedAt;
        if (args.notes) existing.notes = args.notes;
        return existing;
      }

      const created = {
        staffId: args.staffId,
        name: args.name,
        email: args.email,
        staffCode: args.staffCode,
        position: args.position,
        timesheetId: args.timesheetId ?? null,
        timesheetStatus: args.timesheetStatus ?? null,
        submittedAt: args.submittedAt ?? null,
        approvedAt: args.approvedAt ?? null,
        notes: args.notes ?? null,
        totals: {
          plannedMinutes: 0,
          actualMinutes: 0,
          varianceMinutes: 0,
        },
        daysMap: new Map(),
      };

      employeeMap.set(args.staffId, created);
      return created;
    }

    function ensureDay(
      employee: ReturnType<typeof ensureEmployee>,
      dayKey: string
    ) {
      const existing = employee.daysMap.get(dayKey);

      if (existing) return existing;

      const created = {
        date: dayKey,
        actualMinutes: 0,
        plannedMinutes: 0,
        varianceMinutes: 0,
        timesheetDayId: null,
        hourlyRate: null,
        notes: null,
        assignments: [],
      };

      employee.daysMap.set(dayKey, created);
      return created;
    }

    for (const ts of timesheets) {
      const employee = ensureEmployee({
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
      });

      for (const day of ts.days) {
        const dayKey = toDayKey(day.workDate);
        const row = ensureDay(employee, dayKey);

        row.actualMinutes += day.minutesWorked;
        row.timesheetDayId = day.id;
        row.hourlyRate = day.hourlyRate ?? null;
        row.notes = day.notes ?? null;
      }
    }

    for (const assignment of assignments) {
      const employee = ensureEmployee({
        staffId: assignment.staffId,
        name: assignment.staff.name,
        email: assignment.staff.email,
        staffCode: assignment.staff.staffProfile?.staffId ?? null,
        position: assignment.staff.staffProfile?.position ?? null,
      });

      const dayBaseDate =
        assignment.plannedStart ??
        assignment.plannedEnd ??
        assignment.appointment.startTime;

      const dayKey = toDayKey(dayBaseDate);
      const row = ensureDay(employee, dayKey);

      const plannedMinutes = getPlannedMinutes(
        assignment.plannedStart,
        assignment.plannedEnd,
        assignment.breakMinutes
      );

      const clientName =
        assignment.appointment.job.client.companyName ||
        `${assignment.appointment.job.client.firstName} ${assignment.appointment.job.client.lastName}`.trim();

      const addressLine = [
        assignment.appointment.job.address.street1,
        assignment.appointment.job.address.city,
        assignment.appointment.job.address.province,
      ]
        .filter(Boolean)
        .join(", ");

      row.plannedMinutes += plannedMinutes;
      row.assignments.push({
        id: assignment.id,
        appointmentId: assignment.appointmentId,
        jobTitle: assignment.appointment.job.title,
        clientName,
        addressLine,
        status: assignment.status,
        plannedStart: assignment.plannedStart,
        plannedEnd: assignment.plannedEnd,
        breakMinutes: assignment.breakMinutes,
        plannedMinutes,
        hourlyRateAtTime: assignment.hourlyRateAtTime,
        notes: assignment.notes,
      });
    }

    const employees = Array.from(employeeMap.values())
      .map((employee) => {
        const days = Array.from(employee.daysMap.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((day) => {
            const varianceMinutes = day.actualMinutes - day.plannedMinutes;
            return {
              ...day,
              varianceMinutes,
            };
          });

        const plannedMinutes = days.reduce((sum, d) => sum + d.plannedMinutes, 0);
        const actualMinutes = days.reduce((sum, d) => sum + d.actualMinutes, 0);
        const varianceMinutes = actualMinutes - plannedMinutes;

        return {
          staffId: employee.staffId,
          name: employee.name,
          email: employee.email,
          staffCode: employee.staffCode,
          position: employee.position,
          timesheetId: employee.timesheetId,
          timesheetStatus: employee.timesheetStatus,
          submittedAt: employee.submittedAt,
          approvedAt: employee.approvedAt,
          notes: employee.notes,
          totals: {
            plannedMinutes,
            actualMinutes,
            varianceMinutes,
          },
          days,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      period,
      employees,
    });
  } catch (error) {
    console.error("GET /api/admin/timesheets/periods/[periodId]/overview error:", error);
    return NextResponse.json(
      { error: "Failed to load admin timesheet overview" },
      { status: 500 }
    );
  }
}
