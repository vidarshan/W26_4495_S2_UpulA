import { DateTime } from "luxon";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { APP_TZ } from "@/lib/dateTime";
import { AssignmentInsightFields } from "@/types";

type TaskAssistantContextOverrides = {
  jobTitle?: string | null;
  clientName?: string | null;
  requiredStaffCount?: number | null;
};

function formatClientName(client: {
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  if (client.companyName?.trim()) {
    return client.companyName.trim();
  }

  return `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Unknown";
}

function isLocationJson(
  value: Prisma.JsonValue | null,
): value is Prisma.JsonObject & {
  street1?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
} {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function getTaskAssistantContext(
  addressId: string,
  appointmentStart: string,
  appointmentEnd: string,
  overrides: TaskAssistantContextOverrides = {},
): Promise<AssignmentInsightFields | null> {
  const start = new Date(appointmentStart);
  const end = new Date(appointmentEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Invalid appointment window");
  }

  const [address, staff] = await Promise.all([
    prisma.address.findUnique({
      where: { id: addressId },
      select: {
        id: true,
        street1: true,
        city: true,
        province: true,
        postalCode: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        role: "STAFF",
        staffProfile: { isNot: null },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        lastKnownJobLocation: true,
        staffProfile: {
          select: {
            position: true,
            hourlyRate: true,
            staffAddress: {
              select: {
                street1: true,
                city: true,
                province: true,
                postalCode: true,
              },
            },
          },
        },
        leaves: {
          where: {
            startAt: { lte: end },
            endAt: { gte: start },
          },
          select: {
            type: true,
            startAt: true,
            endAt: true,
          },
        },
        assignments: {
          where: {
            appointment: {
              startTime: { lte: end },
              endTime: { gte: start },
            },
          },
          select: {
            status: true,
            plannedStart: true,
            plannedEnd: true,
            appointment: {
              select: {
                startTime: true,
                endTime: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!address) {
    return null;
  }

  const startDt = DateTime.fromJSDate(start, { zone: "utc" }).setZone(APP_TZ);
  const endDt = DateTime.fromJSDate(end, { zone: "utc" }).setZone(APP_TZ);

  return {
    appointmentDate: startDt.startOf("day").toJSDate(),
    startTime: startDt.toFormat("h:mm a"),
    endTime: endDt.toFormat("h:mm a"),
    durationMinutes: Math.max(Math.round(endDt.diff(startDt, "minutes").minutes), 0),
    jobTitle: overrides.jobTitle?.trim() || "Draft job",
    clientName: overrides.clientName?.trim() || formatClientName(address.client),
    propertyAddress: {
      street1: address.street1 ?? "",
      city: address.city ?? "",
      province: address.province ?? "",
      postalCode: address.postalCode ?? "",
    },
    requiredStaffCount: overrides.requiredStaffCount ?? 1,
    staff: staff.map((member) => ({
      id: member.id,
      name: member.name,
      lastKnownJobLocation: member.lastKnownJobLocation
        && isLocationJson(member.lastKnownJobLocation)
        ? {
            street1:
              typeof member.lastKnownJobLocation.street1 === "string"
                ? member.lastKnownJobLocation.street1
                : "",
            city:
              typeof member.lastKnownJobLocation.city === "string"
                ? member.lastKnownJobLocation.city
                : "",
            province:
              typeof member.lastKnownJobLocation.province === "string"
                ? member.lastKnownJobLocation.province
                : "",
            postalCode:
              typeof member.lastKnownJobLocation.postalCode === "string"
                ? member.lastKnownJobLocation.postalCode
                : "",
          }
        : null,
      staffProfile: {
        position: member.staffProfile?.position ?? "Unknown",
        hourlyRate: member.staffProfile?.hourlyRate ?? 0,
        staffAddress: {
          street1: member.staffProfile?.staffAddress?.street1 ?? "",
          city: member.staffProfile?.staffAddress?.city ?? "",
          province: member.staffProfile?.staffAddress?.province ?? "",
          postalCode: member.staffProfile?.staffAddress?.postalCode ?? "",
        },
      },
      leaves: member.leaves,
      assignments: member.assignments.map((assignment) => ({
        status: assignment.status,
        plannedStart: assignment.plannedStart ?? assignment.appointment.startTime,
        plannedEnd: assignment.plannedEnd ?? assignment.appointment.endTime,
        appointment: assignment.appointment,
      })),
    })),
  };
}
