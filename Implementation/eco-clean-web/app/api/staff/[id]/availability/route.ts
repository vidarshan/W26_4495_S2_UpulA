export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

function isErrorWithCode(error: unknown): error is Error & { code: string } {
  return (
    error instanceof Error &&
    typeof (error as Error & { code?: unknown }).code === 'string'
  );
}

/**
 * GET: Retrieve availability history for a specific staff profile.
 * Path: /api/staff/[id]/availability
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params;

    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId },
    });

    if (!staffProfile) {
      return NextResponse.json([], { status: 200 });
    }

    const availabilities = await prisma.staffAvailability.findMany({
      where: { staffProfileId: staffProfile.id },
      orderBy: { effectiveFrom: "desc" },
    });

    return NextResponse.json(availabilities);
  } catch (error) {
    console.error("GET Availability failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new weekly availability record.
 */
import { getAuthSession } from "@/lib/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 🔥 Step 1: Get staff profile
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId },
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: "Staff profile not found" },
        { status: 404 }
      );
    }

    const staffProfileId = staffProfile.id;

    const body = await req.json();

    if (!body.effectiveFrom) {
      return NextResponse.json(
        { error: "Effective date is required" },
        { status: 400 }
      );
    }

    // 🔥 Step 2: Create availability
    const newAvailability = await prisma.staffAvailability.create({
      data: {
        staffProfileId,
        effectiveFrom: new Date(body.effectiveFrom),

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
  } catch (error) {
    console.error("POST Availability failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
  } catch (error: unknown) {
    // Catch Prisma "Record not found" error
    if (isErrorWithCode(error) && error.code === 'P2025') {
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
