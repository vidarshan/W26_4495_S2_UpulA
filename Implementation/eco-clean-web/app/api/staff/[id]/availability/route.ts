export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';

/**
 * GET: Retrieve all availability rules for a specific staff profile.
 * Path: /api/staff/[id]/availability
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  //   const session = await getAuthSession();

  //   // Match security pattern from existing users route
  //   if (!session || session.user.role !== 'ADMIN') {
  //     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  //   }

  try {
    // UNWRAP the params before using them
    const { id: staffProfileId } = await params;

    const availabilities = await prisma.staffAvailability.findMany({
      where: { staffProfileId },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    });

    return NextResponse.json(availabilities);
  } catch (error) {
    console.error('GET Availability failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST: Create a new availability window for a staff member.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  //   const session = await getAuthSession();

  //   if (!session || session.user.role !== 'ADMIN') {
  //     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  //   }

  // 1. UNWRAP the params to avoid "undefined" errors
  const { id: staffProfileId } = await params;

  try {
    const body = await req.json();
    const { dayOfWeek, startMinute, endMinute, effectiveFrom, effectiveTo } =
      body;

    // 2. Business Logic Validation
    if (
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      startMinute >= endMinute ||
      endMinute > 1440
    ) {
      return NextResponse.json(
        { error: 'Invalid time range' },
        { status: 400 },
      );
    }

    // 3. Database Operation
    const newAvailability = await prisma.staffAvailability.create({
      data: {
        staffProfileId: staffProfileId, // Correctly unwrapped string
        dayOfWeek,
        startMinute,
        endMinute,
        // Handle optional dates safely
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
    });

    return NextResponse.json(newAvailability, { status: 201 });
  } catch (error) {
    console.error('POST Availability failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH: Update an existing availability window.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  //   const session = await getAuthSession();
  //   if (!session || session.user.role !== 'ADMIN') {
  //     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  //   }

  try {
    const body = await req.json();
    const { availabilityId, ...updateData } = body;

    if (!availabilityId) {
      return NextResponse.json(
        { error: 'Missing availability ID' },
        { status: 400 },
      );
    }

    const updated = await prisma.staffAvailability.update({
      where: { id: availabilityId },
      data: {
        ...updateData,
        // Ensure standard Date objects for Prisma
        effectiveFrom: updateData.effectiveFrom
          ? new Date(updateData.effectiveFrom)
          : undefined,
        effectiveTo: updateData.effectiveTo
          ? new Date(updateData.effectiveTo)
          : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH Availability failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
