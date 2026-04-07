import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!staffId || !start || !end) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { lt: new Date(end) },
      endTime: { gt: new Date(start) },
      assignments: { some: { staffId } },
    },
    select: {
      startTime: true,
    },
  });

  const dates = [
    ...new Set(
      appointments.map((a) =>
        DateTime.fromJSDate(a.startTime).setZone(APP_TZ).toISODate(),
      ),
    ),
  ];

  return NextResponse.json({ dates });
}
