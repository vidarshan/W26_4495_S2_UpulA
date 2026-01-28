import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const appointments = await prisma.appointment.findMany({
    include: {
      client: true,
      staff: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });
  return NextResponse.json(appointments);
}
