import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req });

    const userId = token?.id || token?.sub;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { phoneNumber } = body;

    // ✅ Validation
    if (!phoneNumber || phoneNumber.trim().length < 6) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    // 🔍 Find staff profile
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: userId as string },
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: "Staff profile not found" },
        { status: 404 }
      );
    }

    // 🚀 Update phone number
    const updated = await prisma.staffProfile.update({
      where: { id: staffProfile.id },
      data: {
        phoneNumber,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Phone update error:", error);

    return NextResponse.json(
      { error: "Failed to update phone number" },
      { status: 500 }
    );
  }
}