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

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (end <= start) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 },
      );
    }

    // 🔥 Calculate requested hours properly
    const msPerDay = 1000 * 60 * 60 * 24;
    const days =
      Math.ceil((end.getTime() - start.getTime()) / msPerDay) || 1;

    const requestedHours = days * 8;

    // 🔥 Fetch existing leaves
    const existingLeaves = await prisma.leave.findMany({
      where: { staffId },
    });

    const calculateHours = (s: Date, e: Date) => {
      const d =
        Math.ceil((e.getTime() - s.getTime()) / msPerDay) || 1;
      return d * 8;
    };

    const vacationUsed = existingLeaves
      .filter((l) => l.type === "VACATION")
      .reduce((acc, l) => acc + calculateHours(l.startAt, l.endAt), 0);

    const VACATION_LIMIT = 80;
    const remaining = VACATION_LIMIT - vacationUsed;

    // 🚨 GUARDRAIL
    if (type === "VACATION" && requestedHours > remaining) {
      return NextResponse.json(
        { error: "Not enough vacation balance" },
        { status: 400 },
      );
    }

    // ✅ Create leave
    const leave = await prisma.leave.create({
      data: {
        staffId,
        type,
        startAt: start,
        endAt: end,
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
