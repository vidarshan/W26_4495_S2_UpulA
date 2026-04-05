import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      street1,
      street2,
      city,
      province,
      postalCode,
      country,
    } = body;

    // ✅ basic validation
    if (!street1 || !city || !province || !country) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 🔍 find staff profile
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: token.id },
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: "Staff profile not found" },
        { status: 404 }
      );
    }

    // 🚀 UPSERT (key part)
    const address = await prisma.staffAddress.upsert({
      where: {
        staffProfileId: staffProfile.id,
      },
      update: {
        street1,
        street2,
        city,
        province,
        postalCode,
        country,
      },
      create: {
        staffProfileId: staffProfile.id,
        street1,
        street2,
        city,
        province,
        postalCode,
        country,
      },
    });

    return NextResponse.json(address);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}