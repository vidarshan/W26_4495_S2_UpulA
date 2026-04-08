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

    const { name, phoneNumber, relationship } = body;

    // Validation
    if (!name || !phoneNumber || !relationship) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: token.id },
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: "Staff profile not found" },
        { status: 404 }
      );
    }

    const emergency = await prisma.emergencyContact.upsert({
      where: {
        staffProfileId: staffProfile.id,
      },
      update: {
        name,
        phoneNumber,
        relationship,
      },
      create: {
        staffProfileId: staffProfile.id,
        name,
        phoneNumber,
        relationship,
      },
    });

    return NextResponse.json(emergency);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update emergency contact" },
      { status: 500 }
    );
  }
}
