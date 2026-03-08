export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET: Retrieve availability history for a specific staff profile.
 * Path: /api/staff/[id]/availability
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: staffProfileId } = await params;

    const availabilities = await prisma.staffAvailability.findMany({
      where: { staffProfileId },
      // Order by the most recent effective date
      orderBy: { effectiveFrom: 'desc' },
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
 * POST: Create a new weekly availability record.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // const { id: staffProfileId } = await params;

  const staffProfileId = '43642b1b-9daa-44c8-990f-15b3cf7e26b6';

  try {
    const body = await req.json();

    // 1. Validation: We only need the effective date now
    if (!body.effectiveFrom) {
      return NextResponse.json(
        { error: 'Effective date is required' },
        { status: 400 },
      );
    }

    // 2. Database Operation
    // We spread the body (...body) because it now contains the
    // boolean fields (monActive, monS1, etc.) instead of 'dayOfWeek'
    const newAvailability = await prisma.staffAvailability.create({
      data: {
        staffProfileId: staffProfileId,
        effectiveFrom: new Date(body.effectiveFrom),
        // These fields must match your NEW schema exactly
        monActive: body.monActive ?? false,
        monS1: body.monS1 ?? false,
        monS2: body.monS2 ?? false,
        tueActive: body.tueActive ?? false,
        tueS1: body.tueS1 ?? false,
        tueS2: body.tueS2 ?? false,
        wedActive: body.wedActive ?? false,
        wedS1: body.wedS1 ?? false,
        wedS2: body.wedS2 ?? false,
        thuActive: body.thuActive ?? false,
        thuS1: body.thuS1 ?? false,
        thuS2: body.thuS2 ?? false,
        friActive: body.friActive ?? false,
        friS1: body.friS1 ?? false,
        friS2: body.friS2 ?? false,
        satActive: body.satActive ?? false,
        satS1: body.satS1 ?? false,
        satS2: body.satS2 ?? false,
        sunActive: body.sunActive ?? false,
        sunS1: body.sunS1 ?? false,
        sunS2: body.sunS2 ?? false,
      },
    });

    return NextResponse.json(newAvailability, { status: 201 });
  } catch (error: any) {
    console.error('POST Availability failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH: Update an existing weekly availability record.
 * This allows partial updates (e.g., just changing Monday's shifts).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
        // Safely handle the date conversion if it's being updated
        effectiveFrom: updateData.effectiveFrom
          ? new Date(updateData.effectiveFrom)
          : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    // Catch Prisma "Record not found" error
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Availability record not found' },
        { status: 404 },
      );
    }

    console.error('PATCH Availability failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
