export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const VALID_LEAVE_TYPES = ["PAID_SICK", "VACATION", "PERSONAL", "UNPAID_SICK"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  //   const session = await getAuthSession();
  //   if (!session || session.user.role !== "ADMIN") {
  //     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  //   }

  const { id: staffId } = await params;

  try {
    const body = await req.json();
    const { type, startAt, endAt, reason } = body;
    // Validate the enum type before hitting the database
    if (!VALID_LEAVE_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid leave type: ${type}. Expected one of: ${VALID_LEAVE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if the User actually exists first
    const userExists = await prisma.user.findUnique({
      where: { id: staffId },
    });

    // Validate the enum type before hitting the database
    if (!VALID_LEAVE_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid leave type: ${type}. Expected one of: ${VALID_LEAVE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!userExists) {
      return NextResponse.json(
        { error: `User with ID ${staffId} not found.` },
        { status: 404 },
      );
    }

    // 2. Create the leave record
    const leave = await prisma.leave.create({
      data: {
        staffId,
        type,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        reason,
      },
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error: any) {
    // Catch specific Prisma Foreign Key errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        {
          error:
            'Foreign key violation: The staffId does not exist in the User table.',
        },
        { status: 400 },
      );
    }

    console.error('POST Leave failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await params;

  try {
    const leaves = await prisma.leave.findMany({
      where: { staffId },
      orderBy: { startAt: 'desc' },
    });

    return NextResponse.json(leaves);
  } catch (error) {
    console.error("GET Leave failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
