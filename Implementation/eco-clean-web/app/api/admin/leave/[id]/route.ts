import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leaveId } = await params; // 👈 FIX HERE

    const body = await req.json();
    const { status } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: { status },
    });

    return NextResponse.json(updatedLeave);
  } catch (error) {
    console.error("PATCH Leave failed:", error);
    return NextResponse.json(
      { error: "Failed to update leave status" },
      { status: 500 }
    );
  }
}