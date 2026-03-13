import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendFiveDayReminderEmail } from "@/lib/appointments/reminders";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const start = new Date(now);
  start.setDate(start.getDate() + 5);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      reminder5dSent: false,
      startTime: {
        gte: start,
        lt: end,
      },
    },
    include: {
      job: {
        include: {
          client: true,
          address: true,
        },
      },
    },
  });
  const results = [];

  for (const appt of appointments) {
    const client = appt.job.client;
    const address = appt.job.address;

    if (!client?.email) {
      results.push({
        id: appt.id,
        status: "skipped",
        reason: "Missing client email",
      });
      continue;
    }

    const clientName =
      [client.firstName, client.lastName].filter(Boolean).join(" ") || null;

    const fullAddress = [
      address?.street1,
      address?.street2,
      address?.city,
      address?.province,
      address?.postalCode,
      address?.country,
    ]
      .filter(Boolean)
      .join(", ");

    try {
      await sendFiveDayReminderEmail({
        to: client.email,
        clientName,
        appointmentDate: appt.startTime,
        jobTitle: appt.job.title,
        address: fullAddress || null,
      });

      await prisma.appointment.update({
        where: { id: appt.id },
        data: {
          reminder5dSent: true,
        },
      });

      results.push({
        id: appt.id,
        status: "sent",
      });
    } catch (error) {
      results.push({
        id: appt.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: appointments.length,
    results,
  });
}
