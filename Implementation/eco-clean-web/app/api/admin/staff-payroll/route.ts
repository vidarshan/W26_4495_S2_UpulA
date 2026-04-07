import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId");

    const staff = await prisma.staffProfile.findMany({
      where: {
        user: {
          is: {
            timesheets: {
              some: {
                ...(periodId ? { periodId: periodId } : {}), // ✅ CORRECT FIELD
                status: "APPROVED", // ✅ ONLY approved
              },
            },
          },
        },
      },

      include: {
        user: true,
        td1: true,
      },
    });

    const data = staff.map((s) => ({
      staffId: s.staffId ?? `STF-${s.id.slice(0, 6)}`,
      staffName: s.user?.name ?? "Unknown",
      hourlyRate: s.hourlyRate ?? 0,

      federalClaimAmount: s.td1?.federalClaimAmount ?? 16452,
      quebecClaimAmount: s.td1?.quebecClaimAmount ?? 0,

      additionalFederalTax: s.td1?.additionalFederalTaxPerPay ?? 0,
      additionalQuebecTax: s.td1?.additionalQuebecTaxPerPay ?? 0,

      isExempt: s.td1?.isExempt ?? false,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("STAFF PAYROLL ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch staff payroll data" },
      { status: 500 }
    );
  }
}