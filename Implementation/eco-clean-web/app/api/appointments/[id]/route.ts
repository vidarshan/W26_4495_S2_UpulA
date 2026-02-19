import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { id } = await context.params;
  const body = await req.json();

  const data: { status?: string; startTime?: Date; endTime?: Date } = {};

  if (body.status) {
    data.status = body.status;
  }

  if (body.startTime && body.endTime) {
    data.startTime = new Date(body.startTime);
    data.endTime = new Date(body.endTime);
  }

  try {
    const updated = await prisma.appointment.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.log(err);
    if (err.code === "P2025") {
      // Record not found
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
