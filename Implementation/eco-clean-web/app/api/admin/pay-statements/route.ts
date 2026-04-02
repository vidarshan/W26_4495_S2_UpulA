import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type PayStatementRow = {
  staffId: string;
  grossEarnings: number;
  deductions: number;
  netEarnings: number;
  regularHours: number;
  regularRate: number;
  otHours: number;
  otRate: number;
  transportAllowance: number;
  federalTax: number;
  ei: number;
  cpp: number;
  health: number;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Internal server error";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      periodStart?: string;
      rows?: PayStatementRow[];
    };
    const { periodStart, rows } = body;

    if (!periodStart || !rows) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // We assume periodEnd is 14 days after start for this example
    const startDate = new Date(periodStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 14);

    // Use a transaction to ensure all or nothing are saved
    const results = await prisma.$transaction(
      rows.map((row) =>
        prisma.payStatement.create({
          data: {
            userId: row.staffId, // Ensure this matches your User model ID
            timesheetPeriodId: "35aa941d-54c1-4b4d-8159-2b02ed1d39aa", // You'll need to pass or find this
            payPeriodStart: startDate,
            payPeriodEnd: endDate,
            payDate: new Date(), // Usually 'today' when generating
            grossEarnings: row.grossEarnings,
            totalDeductions: row.deductions,
            netEarnings: row.netEarnings,
            breakdown: {
              regularHours: row.regularHours,
              regularRate: row.regularRate,
              otHours: row.otHours,
              otRate: row.otRate,
              transportAllowance: row.transportAllowance,
              taxes: {
                federal: row.federalTax,
                ei: row.ei,
                cpp: row.cpp,
                health: row.health,
              },
            },
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
