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
    <div style="margin:0;padding:0;background-color:#f4f8ef;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        Eco Clean reminder: your ${safeJobTitle} appointment is scheduled ${reminderLabel}.
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background-color:#f4f8ef;padding:24px 12px;font-family:'Comic Neue','Comic Sans MS','Trebuchet MS',Arial,sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;border:1px solid #d9e6c3;border-radius:24px;overflow:hidden;box-shadow:0 16px 40px rgba(67, 90, 23, 0.10);font-family:'Comic Neue','Comic Sans MS','Trebuchet MS',Arial,sans-serif;">

              <tr>
                <td style="background:#84cc16;padding:32px;color:#20320a;">
                
                  <div style="margin-top:18px;font-size:30px;font-weight:700;line-height:1.2;">
                    Your cleaning visit is coming up
                  </div>
                  <div style="margin-top:10px;font-size:16px;line-height:1.6;color:#35510f;">
                    A quick heads-up that your appointment is scheduled <strong>${reminderLabel}</strong>.
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 16px;font-size:18px;line-height:1.6;color:#1f2937;font-family:'Comic Neue','Comic Sans MS','Trebuchet MS',Arial,sans-serif;">
                    Hi ${safeClientName},
                  </p>

                  <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#425466;font-family:'Comic Neue','Comic Sans MS','Trebuchet MS',Arial,sans-serif;">
                    We're getting ready for your upcoming <strong>Eco Clean</strong> visit. Here's the schedule so everything stays easy and on time.
                  </p>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;background:#fbfdf7;border:1px solid #dfe8cf;border-radius:18px;font-family:'Comic Neue','Comic Sans MS','Trebuchet MS',Arial,sans-serif;">
                    <tr>
                      <td style="padding:20px;">
                        <div style="margin-bottom:12px;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6a7d4f;">
                            Service
                          </div>
                          <div style="margin-top:6px;font-size:16px;color:#1f2937;">
                            ${safeJobTitle}
                          </div>
                        </div>

                        <div style="margin-bottom:0;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6a7d4f;">
                            Date & Time
                          </div>
                          <div style="margin-top:6px;font-size:16px;color:#1f2937;">
                            ${formattedDate}
                          </div>
                        </div>

                        ${
                          address
                            ? `
                          <div style="margin-top:12px;">
                            <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6a7d4f;">
                              Location
                            </div>
                            <div style="margin-top:6px;font-size:16px;color:#1f2937;">
                              ${address}
                            </div>
                          </div>
                        `
                            : ""
                        }
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:20px;">
                    <tr>
                      <td style="padding:16px 18px;background:#f7fee7;border:1px solid #d9f99d;border-radius:16px;font-size:14px;line-height:1.7;color:#365314;font-family:'Comic Neue','Comic Sans MS','Trebuchet MS',Arial,sans-serif;">
                        If you need to make changes or have questions before the visit, please contact us as early as possible.
                      </td>
                    </tr>
                  </table>
                  <p style="margin:12px 0 0;font-size:15px;line-height:1.8;color:#425466;font-family:'Comic Neue','Comic Sans MS','Trebuchet MS',Arial,sans-serif;">
                    Thank you,<br />
                    <strong style="color:#365314;">Eco Clean</strong>
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:20px 32px;background:#f8faf5;border-top:1px solid #e3ead8;">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#70815b;text-align:center;font-family:'Comic Neue','Comic Sans MS','Trebuchet MS',Arial,sans-serif;">
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
