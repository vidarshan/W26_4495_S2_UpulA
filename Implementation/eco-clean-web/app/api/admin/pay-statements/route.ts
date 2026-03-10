import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
      rows.map((row: any) =>
        prisma.payStatement.create({
          data: {
            userId: row.staffId, // Ensure this matches your User model ID
            timesheetPeriodId: "some-period-id", // You'll need to pass or find this
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
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
