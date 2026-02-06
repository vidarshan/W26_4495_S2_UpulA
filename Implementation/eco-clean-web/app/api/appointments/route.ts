import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

export async function POST(req: Request) {
  const body = await req.json();

  const { startTime, endTime, address, clientId, staffId, price } = body;

  if (
    !startTime ||
    !endTime ||
    !address ||
    !clientId ||
    !staffId ||
    price == null
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      address,
      clientId,
      staffId,
      price: new Prisma.Decimal(price),
      status: "SCHEDULED",
    },
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
