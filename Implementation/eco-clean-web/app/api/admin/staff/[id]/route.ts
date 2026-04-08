import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req });

    if (!token || token.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing staff id" },
        { status: 400 }
      );
    }

    const staff = await prisma.user.findUnique({
      where: { id },
      include: {
        staffProfile: {
          include: {
            staffAddress: true,
            emergencyContact: true,
          },
        },
      },
    });

    if (!staff || staff.role !== "STAFF") {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Admin staff fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch staff details" },
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

    // Only ADMIN allowed
    if (!token || token.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing staff id" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { position, hourlyRate } = body;

    // Validation
    if (hourlyRate !== undefined && Number(hourlyRate) < 0) {
      return NextResponse.json(
        { error: "Hourly rate must be >= 0" },
        { status: 400 }
      );
    }

    // Find staff profile via userId
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: id },
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: "Staff profile not found" },
        { status: 404 }
      );
    }

    // Update
    const updated = await prisma.staffProfile.update({
      where: { id: staffProfile.id },
      data: {
        position: position ?? undefined,
        hourlyRate:
          hourlyRate !== undefined ? Number(hourlyRate) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin staff update error:", error);

    return NextResponse.json(
      { error: "Failed to update staff details" },
      { status: 500 }
    );
  }
}
