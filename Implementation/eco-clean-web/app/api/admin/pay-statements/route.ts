import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

type PayStatementInputRow = {
  userId: string;
  grossEarnings: number;
  deductions: number;
  netEarnings: number;
  [key: string]: unknown;
};

/* ================= GET ================= */
/* Load approved timesheets into payroll UI */

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId");

    if (!periodId) {
      return NextResponse.json(
        { error: "Missing periodId" },
        { status: 400 }
      );
    }

    const timesheets = await prisma.timesheet.findMany({
      where: {
        periodId,
        status: "APPROVED",
      },
      include: {
        staff: true, // your User
      },
    });

    const rows = timesheets.map((ts) => ({
      staffId: ts.staffId, // UI still uses this
      staffName: ts.staff.name,

      regularHours: (ts.totalMinutes || 0) / 60,
      regularRate: 0,
      regularAmount: 0,

      otHours: 0,
      otRate: 0,
      otAmount: 0,

      transportAllowance: 0,

      federalTax: 0,
      quebecTax: 0,
      ei: 0,
      qpp: 0,
      qpp2: 0,
      qpip: 0,

      health: 0,
      other: 0,

      grossEarnings: 0,
      deductions: 0,
      netEarnings: 0,

      manualFederalTax: false,
      manualQuebecTax: false,
      manualEi: false,
      manualQpp: false,
      manualQpp2: false,
      manualQpip: false,
    }));

    return NextResponse.json(rows);

  } catch (error) {
    console.error("GET PAY DATA ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load pay data" },
      { status: 500 }
    );
  }
}

/* ================= POST ================= */
/* Save PayStatements */

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { periodId, rows } = (await req.json()) as {
      periodId?: string;
      rows?: PayStatementInputRow[];
    };

    if (!periodId || !rows?.length) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    // Get period dates
    const period = await prisma.timesheetPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Invalid period" },
        { status: 400 }
      );
    }

    const payDate = new Date(); // you can customize later

    const created = await prisma.$transaction(
      rows.map((row) =>
        prisma.payStatement.create({
          data: {
            userId: row.userId,
            timesheetPeriodId: periodId,

            payPeriodStart: period.startDate,
            payPeriodEnd: period.endDate,
            payDate,

            grossEarnings: row.grossEarnings,
            totalDeductions: row.deductions,
            netEarnings: row.netEarnings,

            breakdown: row,
          },
        })
      )
    );

    return NextResponse.json({
      message: "Pay statements created successfully",
      count: created.length,
    });

  } catch (error) {
    console.error("CREATE PAY ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create pay statements" },
      { status: 500 }
    );
  }
}
