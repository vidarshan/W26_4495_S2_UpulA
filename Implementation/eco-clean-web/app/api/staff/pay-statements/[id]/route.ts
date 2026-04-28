import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { PayBreakdown } from "@/types";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {

  try {
    const token = await getToken({ req });

    if (!token || !token.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: statementId } = await context.params;

    if (!statementId) {
      return NextResponse.json(
        { error: "Missing statement ID" },
        { status: 400 },
      );
    }

    const statement = await prisma.payStatement.findUnique({
      where: { id: statementId },
      include: {
        user: {
          include: {
            staffProfile: true,
          },
        },
      },
    });

    if (!statement || statement.userId !== token.sub) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const yearStart = new Date(statement.payPeriodStart);
    yearStart.setMonth(0);
    yearStart.setDate(1);
    yearStart.setHours(0, 0, 0, 0);

    const ytdStatements = await prisma.payStatement.findMany({
      where: {
        userId: token.sub, // ✅ FIXED
        payPeriodStart: {
          gte: yearStart,
          lte: statement.payPeriodStart,
        },
      },
      orderBy: { payPeriodStart: "asc" },
    });

    const ytd = ytdStatements.reduce(
      (acc, s) => {
        acc.gross += s.grossEarnings || 0;
        acc.deductions += s.totalDeductions || 0;
        acc.net += s.netEarnings || 0;

        const b = (s.breakdown || {}) as PayBreakdown;

        acc.regular += b?.regularAmount || 0;
        acc.overtime += b?.otAmount || 0;
        acc.allowance += b?.transportAllowance || 0;

        acc.federalTax += b?.federalTax || 0;
        acc.quebecTax += b?.quebecTax || 0;
        acc.ei += b?.ei || 0;
        acc.qpp += b?.qpp || 0;
        acc.qpp2 += b?.qpp2 || 0;
        acc.qpip += b?.qpip || 0;

        return acc;
      },
      {
        gross: 0,
        deductions: 0,
        net: 0,
        regular: 0,
        overtime: 0,
        allowance: 0,
        federalTax: 0,
        quebecTax: 0,
        ei: 0,
        qpp: 0,
        qpp2: 0,
        qpip: 0,
      },
    );

    return NextResponse.json({
      ...statement,
      breakdown: statement.breakdown || {},
      ytd,
      employeeName: statement.user?.name || "N/A",
      employeeId: statement.user?.staffProfile?.staffId || "N/A",
    });
  } catch (error) {
    console.error("GET PAY STATEMENT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load pay statement" },
      { status: 500 },
    );
  }
}
