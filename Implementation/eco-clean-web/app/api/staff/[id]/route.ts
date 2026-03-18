export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { NextResponse } from "next/server";

/**
 * GET: Fetch a single staff member's full profile
 * Includes core User data and linked StaffProfile details.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();

  //   // Security check: Only Admins can view full staff details
  //   if (!session || session.user.role !== "ADMIN") {
  //     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  //   }

  try {
    // UNWRAP the dynamic route params
    const { id } = await params;

    const staffMember = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        staffProfile: {
          select: {
            id: true,
            userId: true,
            position: true,
            hourlyRate: true,
            staffAddress: {
              select: {
                postalCode: true,
              },
            },
          },
        },
      },
    });

    // Ensure the user exists and is actually a staff member
    if (!staffMember || staffMember.role !== "STAFF") {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(staffMember);
  } catch (error) {
    console.error("GET staff by ID failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH: Update a staff member's profile
 * Handles updates to User (name, email) and StaffProfile (postalCode, hourlyRate).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, postalCode, hourlyRate } = body;

    const updatedStaff = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
        },
      });

      const profile = await tx.staffProfile.upsert({
        where: { userId: id },
        update: {
          ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
        },
        create: {
          userId: id,
          hourlyRate: Number(hourlyRate) || 0,
        },
      });

      if (postalCode !== undefined) {
        await tx.staffAddress.upsert({
          where: { staffProfileId: profile.id },
          update: {
            postalCode,
          },
          create: {
            staffProfileId: profile.id,
            street1: "",
            city: "",
            province: "",
            country: "",
            postalCode: postalCode || null,
          },
        });
      }

      return tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          staffProfile: {
            select: {
              id: true,
              hourlyRate: true,
              staffAddress: {
                select: {
                  postalCode: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error("PATCH staff failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
