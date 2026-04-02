export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { normalizeAddressLocation } from "@/lib/staffLocation";
import { getAuthSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();

  try {
    const { id } = await params;

    const staffMember = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastKnownJobLocation: true,
        staffProfile: {
          select: {
            id: true,
            userId: true,
            staffId: true,
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
      const existingStaff = await tx.user.findUnique({
        where: { id },
        select: {
          lastKnownJobLocation: true,
          staffProfile: {
            select: {
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
            },
          },
        },
      });

      await tx.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
        },
      });

      const existingProfileCount = await tx.staffProfile.count();

      const generatedStaffId = `STF-ECO-${String(existingProfileCount + 1).padStart(4, "0")}`;

      const profile = await tx.staffProfile.upsert({
        where: { userId: id },
        update: {
          ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
        },
        create: {
          userId: id,
          staffId: generatedStaffId,
          ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
        },
      });

      let nextAddress =
        existingStaff?.staffProfile?.staffAddress ?? null;

      if (postalCode !== undefined) {
        nextAddress = await tx.staffAddress.upsert({
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

      const nextHomeLocation = normalizeAddressLocation(nextAddress);
      const previousHomeLocationJson = normalizeAddressLocation(
        existingStaff?.staffProfile?.staffAddress,
      );

      if (
        nextHomeLocation &&
        (!existingStaff?.lastKnownJobLocation ||
          JSON.stringify(existingStaff.lastKnownJobLocation) ===
            JSON.stringify(previousHomeLocationJson))
      ) {
        await tx.user.update({
          where: { id },
          data: {
            lastKnownJobLocation: nextHomeLocation ?? Prisma.DbNull,
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
          lastKnownJobLocation: true,
          staffProfile: {
            select: {
              id: true,
              userId: true,
              staffId: true,
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
