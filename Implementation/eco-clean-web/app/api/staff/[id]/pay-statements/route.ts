export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET: Retrieve all pay statements for a specific staff member.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    const statements = await prisma.payStatement.findMany({
      where: { userId },
      include: {
        timesheetPeriod: true, // Includes the related period details
      },
      orderBy: { payDate: 'desc' },
    });

    return NextResponse.json(statements);
  } catch (error) {
    console.error('GET PayStatements failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Create a new pay statement.
 * Logic: Automatically calculates payDate (Period End + 5 Days)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const body = await req.json();
    const { timesheetPeriodId, grossEarnings, totalDeductions, netEarnings, breakdown } = body;

    // 1. Fetch the period to get the dates
    const period = await prisma.timesheetPeriod.findUnique({
      where: { id: timesheetPeriodId },
    });

    if (!period) {
      return NextResponse.json({ error: 'Timesheet period not found' }, { status: 404 });
    }

    // 2. Calculate Pay Date (Period End Date + 5 days)
    const payDate = new Date(period.endDate);
    payDate.setDate(payDate.getDate() + 5);

    // 3. Create the statement
    const newStatement = await prisma.payStatement.create({
      data: {
        userId,
        timesheetPeriodId,
        payPeriodStart: period.startDate,
        payPeriodEnd: period.endDate,
        payDate: payDate,
        grossEarnings: parseFloat(grossEarnings),
        totalDeductions: parseFloat(totalDeductions),
        netEarnings: parseFloat(netEarnings),
        breakdown: breakdown || {}, // Stores JSON breakdown of hours/taxes
      },
    });

    return NextResponse.json(newStatement, { status: 201 });
  } catch (error) {
    console.error('POST PayStatement failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH: Update financial totals or breakdown of an existing statement.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { statementId, ...updateData } = body;

    if (!statementId) {
      return NextResponse.json({ error: 'Missing statement ID' }, { status: 400 });
    }

    const updated = await prisma.payStatement.update({
      where: { id: statementId },
      data: {
        ...updateData,
        // Ensure numbers are floats if they are being updated
        grossEarnings: updateData.grossEarnings ? parseFloat(updateData.grossEarnings) : undefined,
        totalDeductions: updateData.totalDeductions ? parseFloat(updateData.totalDeductions) : undefined,
        netEarnings: updateData.netEarnings ? parseFloat(updateData.netEarnings) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH PayStatement failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
