export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Fetch all statements for this user
    const statements = await prisma.payStatement.findMany({
      where: { userId },
      orderBy: { payDate: 'desc' }, // Newest first
    });

    // We send back the simplified records for the list view
    return NextResponse.json(statements);
  } catch (error) {
    console.error('Failed to fetch past statements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
