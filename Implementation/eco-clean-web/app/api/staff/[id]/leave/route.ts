export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';

/**
 * GET: Retrieve all leave records for a specific staff member.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  //   const session = await getAuthSession();
  //   if (!session || session.user.role !== "ADMIN") {
  //     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  //   }

  try {
    const { id: staffId } = await params;

    const leaves = await prisma.leave.findMany({
      where: { staffId },
      orderBy: { startAt: 'desc' },
    });

    return NextResponse.json(leaves);
  } catch (error) {
    console.error('GET Leave failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST: Record a new leave period (Vacation, Sick, etc.)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  //   const session = await getAuthSession();
  //   if (!session || session.user.role !== "ADMIN") {
  //     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  //   }

  try {
    const { id: staffId } = await params;
    const body = await req.json();
    const { type, startAt, endAt, reason } = body;

    if (!type || !startAt || !endAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const leave = await prisma.leave.create({
      data: {
        staffId,
        type, // e.g., "SICK", "VACATION"
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        reason,
      },
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error) {
    console.error('POST Leave failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE: Remove a leave record (e.g., if a staff member cancels their vacation).
 */
export async function DELETE(req: Request) {
  //   const session = await getAuthSession();
  //   if (!session || session.user.role !== "ADMIN") {
  //     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  //   }

  try {
    const { searchParams } = new URL(req.url);
    const leaveId = searchParams.get('leaveId');

    if (!leaveId) {
      return NextResponse.json({ error: 'Missing leaveId' }, { status: 400 });
    }

    await prisma.leave.delete({
      where: { id: leaveId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE Leave failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
