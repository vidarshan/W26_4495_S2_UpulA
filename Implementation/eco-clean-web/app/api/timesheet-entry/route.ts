export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';

/**
 * GET: Retrieve timesheet entries with optional filters for staff or period.
 */
export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const periodId = searchParams.get('periodId');

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        ...(staffId && { staffId }),
        ...(periodId && { periodId }),
      },
      include: {
        staff: { select: { name: true, email: true } },
        period: true,
        assignment: { include: { appointment: { include: { job: true } } } },
      },
      orderBy: { workDate: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('GET TimesheetEntry failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST: Create a new timesheet entry.
 */
export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      periodId,
      staffId,
      assignmentId,
      workDate,
      minutesWorked,
      hourlyRate,
      notes,
    } = body;

    // Validation
    if (!periodId || !staffId || !workDate || minutesWorked === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Ensure the period is not locked before adding entries
    const period = await prisma.timesheetPeriod.findUnique({
      where: { id: periodId },
    });

    if (period?.status === 'LOCKED') {
      return NextResponse.json(
        { error: 'Cannot add entries to a locked period.' },
        { status: 400 },
      );
    }

    const entry = await prisma.timesheetEntry.create({
      data: {
        periodId,
        staffId,
        assignmentId: assignmentId || null,
        workDate: new Date(workDate),
        minutesWorked,
        hourlyRate: hourlyRate || null,
        notes,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An entry already exists for this assignment.' },
        { status: 400 },
      );
    }
    console.error('POST TimesheetEntry failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
