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

  const { id } = await params;
  const isAdmin = session?.user.role === "ADMIN";
  const isSelf = session?.user.role === "STAFF" && session.user.id === id;

  if (!session || (!isAdmin && !isSelf)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, postalCode, hourlyRate, phone, address, emergencyContact } =
      body as {
        name?: string;
        email?: string;
        postalCode?: string;
        hourlyRate?: number;
        phone?: string;
        address?: string;
        emergencyContact?: {
          name?: string;
          phoneNumber?: string;
          relationship?: string;
        };
      };

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
          ...(isAdmin && name && { name }),
          ...(isAdmin && email && { email }),
        },
      });

      const existingProfileCount = await tx.staffProfile.count();

      const generatedStaffId = `STF-ECO-${String(existingProfileCount + 1).padStart(4, "0")}`;

      const profile = await tx.staffProfile.upsert({
        where: { userId: id },
        update: {
          ...(isAdmin &&
            hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
          ...(phone !== undefined && { phoneNumber: phone }),
        },
        create: {
          userId: id,
          staffId: generatedStaffId,
          ...(isAdmin &&
            hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
          ...(phone !== undefined && { phoneNumber: phone }),
        },
      });

      let nextAddress =
        existingStaff?.staffProfile?.staffAddress ?? null;

      if (postalCode !== undefined || address !== undefined) {
        nextAddress = await tx.staffAddress.upsert({
          where: { staffProfileId: profile.id },
          update: {
            ...(address !== undefined && { street1: address }),
            ...(postalCode !== undefined && { postalCode }),
          },
          create: {
            staffProfileId: profile.id,
            street1: address ?? "",
            city: existingStaff?.staffProfile?.staffAddress?.city ?? "",
            province: existingStaff?.staffProfile?.staffAddress?.province ?? "",
            country: existingStaff?.staffProfile?.staffAddress?.country ?? "",
            ...(existingStaff?.staffProfile?.staffAddress?.street2
              ? { street2: existingStaff.staffProfile.staffAddress.street2 }
              : {}),
            postalCode: postalCode ?? existingStaff?.staffProfile?.staffAddress?.postalCode ?? null,
          },
        });
      }

      if (emergencyContact !== undefined) {
        await tx.emergencyContact.upsert({
          where: { staffProfileId: profile.id },
          update: {
            ...(emergencyContact.name !== undefined && {
              name: emergencyContact.name,
            }),
            ...(emergencyContact.phoneNumber !== undefined && {
              phoneNumber: emergencyContact.phoneNumber,
            }),
            ...(emergencyContact.relationship !== undefined && {
              relationship: emergencyContact.relationship,
            }),
          },
          create: {
            staffProfileId: profile.id,
            name: emergencyContact.name ?? "",
            phoneNumber: emergencyContact.phoneNumber ?? "",
            relationship: emergencyContact.relationship ?? "",
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
              position: true,
              staffId: true,
              phoneNumber: true,
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
