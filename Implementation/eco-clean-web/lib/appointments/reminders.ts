import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendFiveDayReminderEmail({
  to,
  clientName,
  appointmentDate,
  jobTitle,
  address,
}: {
  to: string;
  clientName?: string | null;
  appointmentDate: Date;
  jobTitle?: string | null;
  address?: string | null;
}) {
  const formattedDate = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Vancouver",
  }).format(appointmentDate);

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Hi ${clientName ?? "there"},</p>

      <p>This is a friendly reminder that your Eco Clean appointment is scheduled in 5 days.</p>

      <p>
        <strong>Service:</strong> ${jobTitle ?? "Cleaning Appointment"}<br />
        <strong>Date & Time:</strong> ${formattedDate}<br />
        ${address ? `<strong>Location:</strong> ${address}<br />` : ""}
      </p>

      <p>If you need to make any changes, please contact us before the appointment.</p>

      <p>Thank you,<br />Eco Clean</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Reminder: Your Eco Clean appointment is in 5 days",
    html,
  });

  return info;
}