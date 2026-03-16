export const runtime = 'nodejs';

import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';

/**
 * GET: Fetch a single staff member's full profile
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();

  // Optional security check
  // if (!session || session.user.role !== 'ADMIN') {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }

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
        staffProfile: {
          select: {
            id: true,
            staffId: true,
            position: true,
            hourlyRate: true,
            staffAddress: {
              select: {
                id: true,
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
                id: true,
                name: true,
                phoneNumber: true,
                relationship: true,
              },
            },
          },
        },
      },
    });

    if (!staffMember || staffMember.role !== 'STAFF') {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(staffMember);
  } catch (error) {
    console.error('GET staff by ID failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH: Update a staff member's profile
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const {
      name,
      email,
      position,
      hourlyRate,
      staffAddress,
      emergencyContact,
    } = body;

    const isAdmin = session.user.role === 'ADMIN';
    const isStaff = session.user.role === 'STAFF';
    const isOwnProfile = session.user.id === id;

    if (isStaff && !isOwnProfile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedStaff = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id },
        include: {
          staffProfile: true,
        },
      });

      if (!existingUser || existingUser.role !== 'STAFF') {
        throw new Error('STAFF_NOT_FOUND');
      }

      // Admin-only update to core User fields
      const userUpdateData: Record<string, unknown> = {};
      if (isAdmin) {
        if (name !== undefined) userUpdateData.name = name;
        if (email !== undefined) userUpdateData.email = email;
      }

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id },
          data: userUpdateData,
        });
      }

      let profileId: string;

      if (!existingUser.staffProfile) {
        const randomSuffix = Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase();

        const createdProfile = await tx.staffProfile.create({
          data: {
            userId: id,
            staffId: `STF-ECO-${randomSuffix}`,
            position: isAdmin ? (position ?? null) : null,
            hourlyRate:
              isAdmin && hourlyRate !== undefined ? Number(hourlyRate) : 0,
          },
        });

        profileId = createdProfile.id;
      } else {
        profileId = existingUser.staffProfile.id;

        const profileUpdateData: Record<string, unknown> = {};

        if (isAdmin) {
          if (position !== undefined) profileUpdateData.position = position;
          if (hourlyRate !== undefined) {
            profileUpdateData.hourlyRate = Number(hourlyRate);
          }
        }

        if (Object.keys(profileUpdateData).length > 0) {
          await tx.staffProfile.update({
            where: { userId: id },
            data: profileUpdateData,
          });
        }
      }

      if (staffAddress) {
        const { street1, street2, city, province, postalCode, country } =
          staffAddress;

        await tx.staffAddress.upsert({
          where: { staffProfileId: profileId },
          update: {
            ...(street1 !== undefined && { street1 }),
            ...(street2 !== undefined && { street2 }),
            ...(city !== undefined && { city }),
            ...(province !== undefined && { province }),
            ...(postalCode !== undefined && { postalCode }),
            ...(country !== undefined && { country }),
          },
          create: {
            staffProfileId: profileId,
            street1: street1 ?? '',
            street2: street2 ?? null,
            city: city ?? '',
            province: province ?? '',
            postalCode: postalCode ?? null,
            country: country ?? '',
          },
        });
      }

      if (emergencyContact) {
        const {
          name: contactName,
          phoneNumber,
          relationship,
        } = emergencyContact;

        await tx.emergencyContact.upsert({
          where: { staffProfileId: profileId },
          update: {
            ...(contactName !== undefined && { name: contactName }),
            ...(phoneNumber !== undefined && { phoneNumber }),
            ...(relationship !== undefined && { relationship }),
          },
          create: {
            staffProfileId: profileId,
            name: contactName ?? '',
            phoneNumber: phoneNumber ?? '',
            relationship: relationship ?? '',
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
              staffId: true,
              position: true,
              hourlyRate: true,
              staffAddress: {
                select: {
                  id: true,
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
                  id: true,
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
    console.error('PATCH staff failed:', error);

    if (error instanceof Error && error.message === 'STAFF_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
