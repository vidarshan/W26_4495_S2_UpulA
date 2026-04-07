import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      staffProfileId,
      federalClaimAmount,
      quebecClaimAmount,
      additionalFederalTaxPerPay,
      additionalQuebecTaxPerPay,
      isExempt,
      sin,
    } = body;

    const td1 = await prisma.tD1.upsert({
      where: { staffProfileId },
      update: {
        federalClaimAmount,
        quebecClaimAmount,
        additionalFederalTaxPerPay,
        additionalQuebecTaxPerPay,
        isExempt,
        sin,
      },
      create: {
        staffProfileId,
        federalClaimAmount,
        quebecClaimAmount,
        additionalFederalTaxPerPay,
        additionalQuebecTaxPerPay,
        isExempt,
        sin,
      },
    });

    return NextResponse.json(td1);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save TD1" },
      { status: 500 }
    );
  }
}