import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAppointmentReminderEmail } from "@/lib/appointments/reminders";

type ReminderConfig = {
  daysBefore: 5 | 3 | 1;
  flag: "reminder5dSent" | "reminder3dSent" | "reminder1dSent";
};

const REMINDERS: ReminderConfig[] = [
  { daysBefore: 5, flag: "reminder5dSent" },
  { daysBefore: 3, flag: "reminder3dSent" },
  { daysBefore: 1, flag: "reminder1dSent" },
];

function getReminderWindow(daysBefore: number) {
  const now = new Date();

  const start = new Date(now);
  start.setDate(start.getDate() + daysBefore);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allResults: Array<{
    id: string;
    daysBefore: number;
    status: "sent" | "failed" | "skipped";
    reason?: string;
    error?: string;
    email?: string;
  }> = [];

  let totalChecked = 0;

  for (const reminder of REMINDERS) {
    const { start, end } = getReminderWindow(reminder.daysBefore);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        [reminder.flag]: false,
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

    totalChecked += appointments.length;

    for (const appt of appointments) {
      const client = appt.job.client;
      const address = appt.job.address;

      if (!client?.email) {
        allResults.push({
          id: appt.id,
          daysBefore: reminder.daysBefore,
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
        console.log("Sending reminder", {
          appointmentId: appt.id,
          daysBefore: reminder.daysBefore,
          to: client.email,
          startTime: appt.startTime,
        });

        const info = await sendAppointmentReminderEmail({
          to: client.email,
          clientName,
          appointmentDate: appt.startTime,
          jobTitle: appt.job.title,
          address: fullAddress || null,
          daysBefore: reminder.daysBefore,
        });

        console.log("Reminder email sent:", {
          appointmentId: appt.id,
          daysBefore: reminder.daysBefore,
          to: client.email,
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
        });

        await prisma.appointment.update({
          where: { id: appt.id },
          data: {
            [reminder.flag]: true,
          },
        });

        allResults.push({
          id: appt.id,
          daysBefore: reminder.daysBefore,
          status: "sent",
          email: client.email,
        });
      } catch (error) {
        console.error("Reminder send failed:", {
          appointmentId: appt.id,
          daysBefore: reminder.daysBefore,
          to: client.email,
          error,
        });

        allResults.push({
          id: appt.id,
          daysBefore: reminder.daysBefore,
          status: "failed",
          email: client.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: totalChecked,
    results: allResults,
  });
}
