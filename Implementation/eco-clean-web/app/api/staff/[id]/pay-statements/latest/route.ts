export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Fetch the most recent pay statement
    const statement = await prisma.payStatement.findFirst({
      where: { userId },
      orderBy: { payDate: 'desc' },
      include: {
        timesheetPeriod: true,
      },
    });

    if (!statement) {
      return NextResponse.json({ error: 'No pay statements found' }, { status: 404 });
    }

    /**
     * Formatting for your UI:
     * We structure the response to match your Donut Chart (Net vs Taxes vs Other)
     * and your list items (Regular, OT, Transport, etc.)
     */
    const uiData = {
      summary: {
        gross: statement.grossEarnings,
        totalDeductions: statement.totalDeductions,
        net: statement.netEarnings,
      },
      chartData: [
        { name: 'Net Pay', value: statement.netEarnings, color: '#106283' },
        { name: 'Taxes', value: (statement.breakdown as any)?.federalTax || 0, color: '#e67437' },
        { name: 'Other Deductions', value: statement.totalDeductions - ((statement.breakdown as any)?.federalTax || 0), color: '#1a632a' },
      ],
      details: statement.breakdown, // Contains RegularAmount, OTAmount, Transport, EI, CPP, etc.
      period: {
        start: statement.payPeriodStart,
        end: statement.payPeriodEnd,
        payDate: statement.payDate
      }
    };

    return NextResponse.json(uiData);
  } catch (error) {
    console.error('Latest PayStatement fetch failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
