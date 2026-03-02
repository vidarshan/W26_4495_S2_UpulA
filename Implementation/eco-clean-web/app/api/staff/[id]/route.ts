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
  { params }: { params: Promise<{ id: string }> }
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
        // Join the StaffProfile table
        staffProfile: {
          select: {
            id: true,
            postalCode: true,
            hourlyRate: true,
          }
        }
      }
    });

    // Ensure the user exists and is actually a staff member
    if (!staffMember || staffMember.role !== "STAFF") {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json(staffMember);
  } catch (error) {
    console.error("GET staff by ID failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH: Update a staff member's profile
 * Handles updates to User (name, email) and StaffProfile (postalCode, hourlyRate).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, postalCode, hourlyRate } = body;

    // Use a transaction to ensure atomic updates across both tables
    const updatedStaff = await prisma.$transaction(async (tx) => {
      // 1. Update core User fields
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
        },
      });

      // 2. Upsert the StaffProfile (Create if it doesn't exist, update if it does)
      const profile = await tx.staffProfile.upsert({
        where: { userId: id },
        update: {
          ...(postalCode && { postalCode }),
          ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
        },
        create: {
          userId: id,
          postalCode: postalCode || null,
          hourlyRate: Number(hourlyRate) || 0,
        },
      });

      return { ...user, staffProfile: profile };
    });

    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error("PATCH staff failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
