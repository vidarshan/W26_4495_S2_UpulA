import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffMember = await prisma.user.findUnique({
      where: { id: session.user.id },
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
                street1: true,
                street2: true,
                city: true,
                province: true,
                postalCode: true,
                country: true,
              },
            },
            emergencyContact: {
              select: {
                name: true,
                phoneNumber: true,
                relationship: true,
              },
            },
          },
        },
      },
    });

    if (!staffMember || staffMember.role !== "STAFF") {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json(staffMember);
  } catch (error) {
    console.log(error);
  }
}
