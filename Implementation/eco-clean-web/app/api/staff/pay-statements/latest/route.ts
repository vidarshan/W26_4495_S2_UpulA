import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const latest = await prisma.payStatement.findFirst({
      where: { userId: token.id },
      orderBy: { payPeriodStart: "desc" },
    });

    if (!latest) {
      return NextResponse.json({ error: "No statements found" }, { status: 404 });
    }

    // ✅ YTD calculation
    const ytdStatements = await prisma.payStatement.findMany({
      where: {
        userId: token.id,
        payPeriodStart: {
          lte: latest.payPeriodStart,
        },
      },
    });

    const ytd = ytdStatements.reduce(
      (acc, s) => {
        acc.gross += s.grossEarnings;
        acc.deductions += s.totalDeductions;
        acc.net += s.netEarnings;

        const b = s.breakdown as any;

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
        federalTax: 0,
        quebecTax: 0,
        ei: 0,
        qpp: 0,
        qpp2: 0,
        qpip: 0,
      }
    );

    return NextResponse.json({
      ...latest,
      ytd,
    });

  } catch (error) {
    console.error("GET LATEST PAY ERROR:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}