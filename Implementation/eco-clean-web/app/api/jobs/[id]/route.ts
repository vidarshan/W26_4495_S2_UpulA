import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
        staffMembers: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        lineItems: true,
        recurrence: true,
        appointments: true,
        notes: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
