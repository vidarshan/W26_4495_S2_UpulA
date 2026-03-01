export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';

// GET: Retrieve all availability rules for a specific staff profile
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAuthSession();
  //   if (!session || session.user.role !== "ADMIN") {
  //     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  //   }

  try {
    const availabilities = await prisma.staffAvailability.findMany({
      where: { staffProfileId: params.id },
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

// POST: Add a new availability window
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  //   const session = await getAuthSession();
  //   if (!session || session.user.role !== "ADMIN") {
  //     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  //   }

  try {
    const body = await req.json();
    const { dayOfWeek, startMinute, endMinute, effectiveFrom, effectiveTo } =
      body;

    // Validation: Ensure minutes are within a 24-hour range (0-1440)
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

    const newAvailability = await prisma.staffAvailability.create({
      data: {
        staffProfileId: params.id,
        dayOfWeek,
        startMinute,
        endMinute,
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

// PATCH/PUT: Update an existing availability window
// Note: Usually, you'd send the availability ID in the body or use a deeper route
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  //   const session = await getAuthSession();
  //   if (!session || session.user.role !== "ADMIN") {
  //     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        // Ensure dates are correctly parsed if provided
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
