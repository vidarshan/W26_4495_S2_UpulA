export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';

/**
 * GET: Retrieve assignments with details
 */
export async function GET(req: Request) {
//   const session = await getAuthSession();
//   if (!session || session.user.role !== 'ADMIN') {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
//   }

  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const appointmentId = searchParams.get('appointmentId');

    const assignments = await prisma.assignment.findMany({
      where: {
        ...(staffId && { staffId }),
        ...(appointmentId && { appointmentId }),
      },
      include: {
        staff: { select: { name: true, email: true } },
        appointment: {
          include: {
            job: { include: { client: true, address: true } },
          },
        },
      },
      orderBy: { plannedStart: 'asc' },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('GET Assignments failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST: Assign a staff member to an appointment
 */
export async function POST(req: Request) {
//   const session = await getAuthSession();
//   if (!session || session.user.role !== 'ADMIN') {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
//   }

  try {
    const body = await req.json();
    const { appointmentId, staffId, plannedStart, plannedEnd, notes } = body;

    if (!appointmentId || !staffId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // 1. Fetch staff hourly rate for the payroll snapshot
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: staffId },
    });

    // 2. Create the assignment with a snapshot of the current rate
    const assignment = await prisma.assignment.create({
      data: {
        appointmentId,
        staffId,
        plannedStart: plannedStart ? new Date(plannedStart) : null,
        plannedEnd: plannedEnd ? new Date(plannedEnd) : null,
        hourlyRateAtTime: staffProfile?.hourlyRate || 0,
        notes,
        status: 'PENDING',
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('POST Assignment failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH: Update assignment status (Clock-in/Clock-out)
 */
export async function PATCH(req: Request) {
//   const session = await getAuthSession();
//   // Allow STAFF to update their own assignment status for clock-in/out
//   if (!session) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//   }

  try {
    const body = await req.json();
    const { id, status, actualStart, actualEnd, breakMinutes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 },
      );
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(actualStart && { actualStart: new Date(actualStart) }),
        ...(actualEnd && { actualEnd: new Date(actualEnd) }),
        ...(breakMinutes !== undefined && { breakMinutes }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH Assignment failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
