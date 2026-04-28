import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId");

    if (!periodId) {
      return NextResponse.json(
        { error: "Missing periodId" },
        { status: 400 }
      );
    }

    const staff = await prisma.staffProfile.findMany({
      where: {
        user: {
          is: {
            timesheets: {
              some: {
                periodId,
                status: "APPROVED",
              },
            },
          },
        },
      },

      include: {
        user: {
          include: {
            timesheets: {
              where: {
                periodId,
                status: "APPROVED",
              },
              // ✅ No need to include days since we use totalMinutes
            },
          },
        },
        td1: true,
      },
    });

    const data = staff.map((s) => {
      const timesheets = s.user?.timesheets ?? [];

      // ✅ Use precomputed totalMinutes (FAST + CORRECT)
      let totalMinutes = 0;

      for (const ts of timesheets) {
        totalMinutes += ts.totalMinutes ?? 0;
      }

      // ✅ Convert to hours
      const totalHours = totalMinutes / 60;

      // ✅ Apply 40-hour rule
      const regularHours = Math.min(40, totalHours);
      const otHours = totalHours > 40 ? totalHours - 40 : 0;

      return {
        userId: s.userId,
        staffId: s.staffId ?? `STF-${s.id.slice(0, 6)}`,
        staffName: s.user?.name ?? "Unknown",
        hourlyRate: s.hourlyRate ?? 0,

        // 🔥 THIS FIXES YOUR UI ISSUE
        totalHours,
        totalRegularHours: regularHours,
        totalOtHours: otHours,

        federalClaimAmount: s.td1?.federalClaimAmount ?? 16452,
        quebecClaimAmount: s.td1?.quebecClaimAmount ?? 0,

        additionalFederalTax:
          s.td1?.additionalFederalTaxPerPay ?? 0,
        additionalQuebecTax:
          s.td1?.additionalQuebecTaxPerPay ?? 0,

        isExempt: s.td1?.isExempt ?? false,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("STAFF PAYROLL ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch staff payroll data" },
      { status: 500 }
    );
  }
}
