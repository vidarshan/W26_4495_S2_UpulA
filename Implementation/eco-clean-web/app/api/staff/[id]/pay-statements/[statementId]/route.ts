export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; statementId: string }> }
) {
  try {
    const { statementId } = await params;

    const statement = await prisma.payStatement.findUnique({
      where: { id: statementId },
      include: { timesheetPeriod: true },
    });

    if (!statement) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    // Reuse the same formatting logic from your "latest" route
    const uiData = {
      id: statement.id,
      summary: {
        gross: statement.grossEarnings,
        totalDeductions: statement.totalDeductions,
        net: statement.netEarnings,
      },
      chartData: [
        { name: 'Net Pay', value: statement.netEarnings, color: '#1f6b8f' },
        { name: 'Taxes', value: (statement.breakdown as any)?.federalTax || 0, color: '#eb7a2f' },
        { name: 'Other Deductions', value: statement.totalDeductions - ((statement.breakdown as any)?.federalTax || 0), color: '#2e7d32' },
      ],
      details: statement.breakdown,
      period: {
        start: statement.payPeriodStart,
        end: statement.payPeriodEnd,
        payDate: statement.payDate
      }
    };

    return NextResponse.json(uiData);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
