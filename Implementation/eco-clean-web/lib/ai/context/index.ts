import { prisma } from "@/lib/prisma";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";

export async function getTaskAssistantContext(
  appointmentId: string,
  options?: {
    includePreviousVisit?: boolean;
    staffNoteDraft?: string | null;
  },
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      job: {
        include: {
          client: true,
          address: true,
          lineItems: true,
          notes: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
      },
      assignments: true,
    },
  });

  if (!appointment) return null;

  const start = DateTime.fromJSDate(appointment.startTime).setZone(APP_TZ);
  const end = DateTime.fromJSDate(appointment.endTime).setZone(APP_TZ);
  const durationMinutes = Math.max(
    0,
    Math.round(end.diff(start, "minutes").minutes),
  );

  const clientName =
    `${appointment.job.client.firstName} ${appointment.job.client.lastName}`.trim();

  const addressParts = [
    appointment.job.address?.street1,
    appointment.job.address?.city,
    appointment.job.address?.province,
  ].filter(Boolean);

  const propertyAddress = addressParts.join(", ");

  const lineItems = appointment.job.lineItems.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    description: item.description ?? null,
  }));

  const adminNotes = appointment.job.notes
    .map((note) => note.content?.trim())
    .filter((note): note is string => Boolean(note));

  const clientNotes = appointment.job.notes
    .filter((note) => note.isClientVisible)
    .map((note) => note.content?.trim())
    .filter((note): note is string => Boolean(note));

  const visitNotes = appointment.notes
    .map((note) => note.content?.trim())
    .filter((note): note is string => Boolean(note));

  let previousVisitSummary: string | null = null;
  let previousVisitIssues: string[] = [];

  if (options?.includePreviousVisit) {
    const prev = await prisma.appointment.findFirst({
      where: {
        jobId: appointment.jobId,
        startTime: { lt: appointment.startTime },
        status: "COMPLETED",
      },
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { startTime: "desc" },
    });

    if (prev) {
      const prevNotes = prev.notes
        .map((note) => note.content?.trim())
        .filter((note): note is string => Boolean(note));

      previousVisitSummary = prevNotes.length > 0 ? prevNotes.join(" ") : null;
      previousVisitIssues = prevNotes;
    }
  }

  return {
    appointmentId: appointment.id,
    appointmentDate: start.toISODate() ?? start.toFormat("yyyy-MM-dd"),
    startTime: start.toFormat("h:mm a"),
    endTime: end.toFormat("h:mm a"),
    durationMinutes,

    status: appointment.status,

    jobTitle: appointment.job.title,
    jobType: appointment.job.type,
    visitInstructions: appointment.job.visitInstructions ?? null,

    clientName,
    propertyAddress,

    staffCount: appointment.assignments.length,

    lineItems,
    adminNotes,
    clientNotes,
    visitNotes,

    previousVisitSummary,
    previousVisitIssues,

    staffNoteDraft: options?.staffNoteDraft ?? null,
    timeSpent: appointment.timeSpent ?? null,
  };
}
