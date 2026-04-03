import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("PAY STATEMENT ROUTE HIT");

  try {
    const token = await getToken({ req });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const statementId = params.id;

    if (!statementId) {
      return NextResponse.json(
        { error: "Missing statement ID" },
        { status: 400 }
      );
    }

    // ✅ Get statement with relations
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

    console.log("🔍 STATEMENT:", statement);
    console.log("👤 USER:", statement?.user);
    console.log("🪪 STAFF PROFILE:", statement?.user?.staffProfile);

    if (!statement || statement.userId !== token.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ✅ Start of year (Jan 1)
    const yearStart = new Date(statement.payPeriodStart);
    yearStart.setMonth(0);
    yearStart.setDate(1);
    yearStart.setHours(0, 0, 0, 0);

    // ✅ Fetch YTD statements
    const ytdStatements = await prisma.payStatement.findMany({
      where: {
        userId: token.id,
        payPeriodStart: {
          gte: yearStart,
          lte: statement.payPeriodStart,
        },
      },
      orderBy: { payPeriodStart: "asc" },
    });

    console.log("📊 YTD COUNT:", ytdStatements.length);

    // ✅ Calculate YTD
    const ytd = ytdStatements.reduce(
      (acc, s) => {
        acc.gross += s.grossEarnings || 0;
        acc.deductions += s.totalDeductions || 0;
        acc.net += s.netEarnings || 0;

        const b = (s.breakdown || {}) as any;

        // Earnings
        acc.regular += b?.regularAmount || 0;
        acc.overtime += b?.otAmount || 0;
        acc.allowance += b?.transportAllowance || 0;

        // Taxes
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
      }
    );

    console.log("💰 YTD RESULT:", ytd);

    // ✅ Final response
    return NextResponse.json({
      ...statement,
      breakdown: statement.breakdown || {},
      ytd,

      // ✅ Employee info
      employeeName: statement.user?.name || "N/A",
      employeeId: statement.user?.staffProfile?.staffId || "N/A",
    });

  } catch (error) {
    console.error("GET PAY STATEMENT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load pay statement" },
      { status: 500 }
    );
  }
}