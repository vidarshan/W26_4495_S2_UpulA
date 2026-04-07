import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req });

    // 🔐 Admin check
    if (!token || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing staff id" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        staffProfile: {
          include: {
            bankDetails: true,
            td1: true,
          },
        },
      },
    });

    if (!user || user.role !== "STAFF") {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      bankDetails: user.staffProfile?.bankDetails,
      td1: user.staffProfile?.td1,
    });
  } catch (error) {
    console.error("Financial GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch financial details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req });

    // 🔐 Admin check
    if (!token || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const body = await req.json();
    const { bank, tax } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing staff id" },
        { status: 400 }
      );
    }

    // 🔍 Get staff profile
    const user = await prisma.user.findUnique({
      where: { id },
      include: { staffProfile: true },
    });

    if (!user || !user.staffProfile) {
      return NextResponse.json(
        { error: "Staff profile not found" },
        { status: 404 }
      );
    }

    const staffProfileId = user.staffProfile.id;

    // -------------------------
    // VALIDATIONS
    // -------------------------
    if (tax?.sin && !/^\d{9}$/.test(tax.sin)) {
      return NextResponse.json(
        { error: "Invalid SIN (must be 9 digits)" },
        { status: 400 }
      );
    }

    // -------------------------
    // UPSERT BANK DETAILS
    // -------------------------
    if (bank) {
      await prisma.bankDetails.upsert({
        where: { staffProfileId },
        update: {
          bankName: bank.bankName,
          accountHolder: bank.accountHolder,
          institutionNo: bank.institutionNo,
          transitNo: bank.transitNo,
          accountNo: bank.accountNo,
        },
        create: {
          staffProfileId,
          bankName: bank.bankName,
          accountHolder: bank.accountHolder,
          institutionNo: bank.institutionNo,
          transitNo: bank.transitNo,
          accountNo: bank.accountNo,
        },
      });
    }

    // -------------------------
    // UPSERT TD1
    // -------------------------
    if (tax) {
 await prisma.tD1.upsert({
  where: { staffProfileId },
  update: {
    federalClaimAmount: body.federalClaimAmount,
    quebecClaimAmount: body.quebecClaimAmount,

    additionalFederalTaxPerPay: body.additionalFederalTaxPerPay ?? 0,
    additionalQuebecTaxPerPay: body.additionalQuebecTaxPerPay ?? 0,

    isExempt: body.isExempt ?? false,
    sin: body.sin,
  },
  create: {
    staffProfileId,

    federalClaimAmount: body.federalClaimAmount ?? 16452,
    quebecClaimAmount: body.quebecClaimAmount ?? 0,

    additionalFederalTaxPerPay: body.additionalFederalTaxPerPay ?? 0,
    additionalQuebecTaxPerPay: body.additionalQuebecTaxPerPay ?? 0,

    isExempt: body.isExempt ?? false,
    sin: body.sin,
  },
});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Financial PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update financial details" },
      { status: 500 }
    );
  }
}