export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parseAppDateTimeInput } from '@/lib/dateTime';

const VALID_LEAVE_TYPES = ["PAID_SICK", "VACATION", "PERSONAL", "UNPAID_SICK"];

function isErrorWithCode(error: unknown): error is Error & { code: string } {
  return (
    error instanceof Error &&
    typeof (error as Error & { code?: unknown }).code === 'string'
  );
}

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

    const parsedStartAt = parseAppDateTimeInput(String(startAt));
    const parsedEndAt = parseAppDateTimeInput(String(endAt));

    if (!parsedStartAt || !parsedEndAt || parsedEndAt <= parsedStartAt) {
      return NextResponse.json(
        { error: 'Invalid leave date range' },
        { status: 400 },
      );
    }

    // 2. Create the leave record
    const leave = await prisma.leave.create({
      data: {
        staffId,
        type,
        startAt: parsedStartAt,
        endAt: parsedEndAt,
        reason,
      },
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error: unknown) {
    // Catch specific Prisma Foreign Key errors
    if (isErrorWithCode(error) && error.code === 'P2003') {
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
