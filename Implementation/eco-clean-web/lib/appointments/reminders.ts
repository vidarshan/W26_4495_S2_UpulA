import nodemailer from "nodemailer";

// Make sure you have appointments that match:
// status = SCHEDULED
// correct reminder flag = false
// startTime inside the target window

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendAppointmentReminderEmail({
  to,
  clientName,
  appointmentDate,
  jobTitle,
  address,
  daysBefore,
}: {
  to: string;
  clientName?: string | null;
  appointmentDate: Date;
  jobTitle?: string | null;
  address?: string | null;
  daysBefore: 5 | 3 | 1 | number;
}) {
  const formattedDate = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Vancouver",
  }).format(appointmentDate);

  const safeClientName = clientName?.trim() || "there";
  const safeJobTitle = jobTitle?.trim() || "Cleaning Appointment";

  const reminderLabel = daysBefore === 1 ? "tomorrow" : `in ${daysBefore} days`;

  const subject =
    daysBefore === 1
      ? "Eco Clean Reminder: Your appointment is tomorrow"
      : `Eco Clean Reminder: Your appointment is in ${daysBefore} days`;

  const html = `
    <div style="margin:0;padding:0;background-color:#f4f7fb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background-color:#f4f7fb;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">

              <tr>
                <td style="background:linear-gradient(135deg,#0ea5e9,#14b8a6);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:24px;font-weight:700;letter-spacing:0.2px;">
                    Eco Clean
                  </div>
                  <div style="margin-top:6px;font-size:14px;opacity:0.95;">
                    Appointment Reminder
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">
                    Hi ${safeClientName},
                  </p>

                  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">
                    This is a friendly reminder that your upcoming <strong>Eco Clean</strong> appointment is scheduled <strong>${reminderLabel}</strong>.
                  </p>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                    <tr>
                      <td style="padding:20px;">
                        <div style="margin-bottom:12px;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">
                            Service
                          </div>
                          <div style="margin-top:4px;font-size:15px;color:#111827;">
                            ${safeJobTitle}
                          </div>
                        </div>

                        <div style="margin-bottom:12px;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">
                            Date & Time
                          </div>
                          <div style="margin-top:4px;font-size:15px;color:#111827;">
                            ${formattedDate}
                          </div>
                        </div>

                        ${
                          address
                            ? `
                          <div>
                            <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">
                              Location
                            </div>
                            <div style="margin-top:4px;font-size:15px;color:#111827;">
                              ${address}
                            </div>
                          </div>
                        `
                            : ""
                        }
                      </td>
                    </tr>
                  </table>

                  <p style="margin:24px 0 0;font-size:15px;line-height:1.7;color:#374151;">
                    If you need to make any changes or have any questions before your appointment, please contact us in advance.
                  </p>

                  <p style="margin:24px 0 0;font-size:15px;line-height:1.7;color:#374151;">
                    Thank you,<br />
                    <strong>Eco Clean</strong>
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;text-align:center;">
                    This is an automated reminder from Eco Clean.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = `
Hi ${safeClientName},

This is a friendly reminder that your upcoming Eco Clean appointment is scheduled ${reminderLabel}.

Service: ${safeJobTitle}
Date & Time: ${formattedDate}
${address ? `Location: ${address}` : ""}

If you need to make any changes or have any questions before your appointment, please contact us in advance.

Thank you,
Eco Clean
  `.trim();

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });

  return info;
}
