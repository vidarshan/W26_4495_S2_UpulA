import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { PayBreakdown } from '@/types';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ statementId: string }> },
) {
  try {
    const token = await getToken({ req });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { statementId } = await context.params;

    if (!statementId) {
      return NextResponse.json(
        { error: 'Missing statement ID' },
        { status: 400 },
      );
    }

    const statement = await prisma.payStatement.findUnique({
      where: { id: statementId },
      include: {
        user: {
          include: {
            staffProfile: true,
          },
        },
        timesheetPeriod: true,
      },
    });

    if (!statement) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const yearStart = new Date(statement.payPeriodStart);
    yearStart.setMonth(0);
    yearStart.setDate(1);
    yearStart.setHours(0, 0, 0, 0);

    const ytdStatements = await prisma.payStatement.findMany({
      where: {
        userId: statement.userId,
        payPeriodStart: {
          gte: yearStart,
          lte: statement.payPeriodStart,
        },
      },
      orderBy: { payPeriodStart: 'asc' },
    });

    const ytd = ytdStatements.reduce(
      (acc, payStatement) => {
        const breakdown = (payStatement.breakdown || {}) as PayBreakdown;

        acc.gross += payStatement.grossEarnings || 0;
        acc.deductions += payStatement.totalDeductions || 0;
        acc.net += payStatement.netEarnings || 0;
        acc.regular += breakdown.regularAmount || 0;
        acc.overtime += breakdown.otAmount || 0;
        acc.allowance += breakdown.transportAllowance || 0;
        acc.federalTax += breakdown.federalTax || 0;
        acc.quebecTax += breakdown.quebecTax || 0;
        acc.ei += breakdown.ei || 0;
        acc.qpp += breakdown.qpp || 0;
        acc.qpp2 += breakdown.qpp2 || 0;
        acc.qpip += breakdown.qpip || 0;

        return acc;
      },
      {
        gross: 0,
        deductions: 0,
        net: 0,
        regular: 0,
        overtime: 0,
        allowance: 0,
        federalTax: 0,
        quebecTax: 0,
        ei: 0,
        qpp: 0,
        qpp2: 0,
        qpip: 0,
      },
    );

    return NextResponse.json({
      ...statement,
      breakdown: statement.breakdown || {},
      ytd,
      employeeName: statement.user?.name || 'N/A',
      employeeId: statement.user?.staffProfile?.staffId || 'N/A',
    });
  } catch (error) {
    console.error('GET ADMIN PAY STATEMENT ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to load pay statement' },
      { status: 500 },
    );
  }
}
