import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const leaves = await prisma.leave.findMany({
      include: {
        staff: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(leaves);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}