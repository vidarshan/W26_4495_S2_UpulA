import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  console.log("🔥 LATEST PAY ROUTE HIT");

  try {
    const token = await getToken({ req });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ GET latest WITH relations
    const latest = await prisma.payStatement.findFirst({
      where: { userId: token.id },
      orderBy: { payPeriodStart: "desc" },
      include: {
        user: {
          include: {
            staffProfile: true,
          },
        },
      },
    });

    console.log("📄 LATEST:", latest);

    if (!latest) {
      return NextResponse.json(
        { error: "No statements found" },
        { status: 404 }
      );
    }

    // ✅ FIXED: start of year
    const yearStart = new Date(latest.payPeriodStart);
    yearStart.setMonth(0);
    yearStart.setDate(1);
    yearStart.setHours(0, 0, 0, 0);

    // ✅ YTD (ONLY same year)
    const ytdStatements = await prisma.payStatement.findMany({
      where: {
        userId: token.id,
        payPeriodStart: {
          gte: yearStart,
          lte: latest.payPeriodStart,
        },
      },
      orderBy: { payPeriodStart: "asc" },
    });

    console.log("📊 YTD COUNT:", ytdStatements.length);

    // ✅ FULL YTD CALC (match your main route)
    const ytd = ytdStatements.reduce(
      (acc, s) => {
        acc.gross += s.grossEarnings || 0;
        acc.deductions += s.totalDeductions || 0;
        acc.net += s.netEarnings || 0;

        const b = (s.breakdown || {}) as any;

        // earnings
        acc.regular += b?.regularAmount || 0;
        acc.overtime += b?.otAmount || 0;
        acc.allowance += b?.transportAllowance || 0;

        // taxes
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

    console.log("💰 YTD:", ytd);

    // ✅ FINAL RESPONSE (MATCH UI EXPECTATION)
    return NextResponse.json({
      ...latest,

      breakdown: latest.breakdown || {},

      ytd,

      // 🔥 EMPLOYEE INFO
      employeeName: latest.user?.name || "N/A",
      employeeId: latest.user?.staffProfile?.staffId || "N/A",
    });

  } catch (error) {
    console.error("❌ GET LATEST PAY ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load latest pay statement" },
      { status: 500 }
    );
  }
}