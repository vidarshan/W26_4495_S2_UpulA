import { prisma } from "@/lib/prisma";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail(to: string, subject: string, html: string) {
  const response = await resend.emails.send({
    from: "Eco Clean <onboarding@resend.dev>",
    to: "vidarshanadithya3@gmail.com",
    subject,
    html,
  });
}

export function reminderTemplate(days: number, date: string, time: string) {
  return `
    <h1>Nettoyage Eco Vert</h1>
    <p>
      You have an appointment scheduled in ${days} days
      on <strong>${date}</strong> at <strong>${time}</strong>.
    </p>
  `;
}

export async function run5DayReminders(now = new Date()) {
  const target = addDays(now, 5);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      reminder5dSent: false,
      startTime: {
        gte: startOfDay(target),
        lt: endOfDay(target),
      },
    },
    include: {
      job: {
        include: {
          client: true,
        },
      },
    },
  });

  for (const appt of appointments) {
    try {
      const date = appt.startTime.toDateString();
      const time = appt.startTime.toUTCString().slice(17, 22);

      await sendEmail(
        appt.job.client.email,
        "Appointment reminder",
        reminderTemplate(5, date, time),
      );

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminder5dSent: true },
      });
    } catch {
      // do nothing → cron retries next run
    }
  }
}
