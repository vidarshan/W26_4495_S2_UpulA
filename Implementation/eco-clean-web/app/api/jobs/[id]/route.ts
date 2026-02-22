import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        client: true,
        address: true,
        appointments: {
          include: {
            staff: true,
            notes: true,
            images: true,
          },
        },
        lineItems: true,
        notes: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await context.params;

  const updated = await prisma.appointment.updateMany({
    where: { jobId },
    data: { status: "CANCELLED" },
  });

  if (updated.count === 0) {
    return NextResponse.json(
      { success: false, message: "No appointments found for this job" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    cancelledAppointments: updated.count,
  });
}
