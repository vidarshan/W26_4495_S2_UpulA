import {
  StaffRecommendationResponse,
  TaskAssistantResponse,
} from "@/lib/ai/schemas";
import { AppointmentWithRelations, CandidateResponse } from "@/types";
import { apiClient } from "./client";

export type UpdateAppointmentPayload = Partial<{
  startTime: string; // ISO
  endTime: string; // ISO
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "LATE";
  staffIds: string[];
  leadStaffId: string | null;
  checklist: Array<{
    id?: string;
    label: string;
  }>;
  note: string | null;
}>;

export function updateAppointment(
  id: string,
  payload: UpdateAppointmentPayload,
) {
  return apiClient(`/api/appointments/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export function cancelAppointment(id: string) {
  return updateAppointment(id, { status: "CANCELLED" });
}

export function deleteAppointment(id: string) {
  return apiClient(`/api/appointments/${id}`, {
    method: "DELETE",
  });
}

export async function rescheduleAppointment(
  id: string,
  start: Date,
  end: Date,
) {
  const res = await fetch(`/api/appointments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to reschedule appointment");
  }

  return res.json();
}

export async function getStaffAppointments({
  staffId,
  start,
  end,
}: {
  staffId: string;
  start: string;
  end: string;
}) {
  const params = new URLSearchParams({
    staffId,
    start,
    end,
    view: "tasks",
  });

  const res = await fetch(`/api/appointments?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch staff appointments");
  }

  return res.json();
}

export async function getMarkedDates({
  staffId,
  start,
  end,
}: {
  staffId: string;
  start: string;
  end: string;
}) {
  const params = new URLSearchParams({ staffId, start, end });
  const res = await fetch(`/api/appointments/marked-dates?${params}`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch marked dates");
  return res.json() as Promise<{ dates: string[] }>;
}

export function getAppointmentById(id: string) {
  return apiClient<AppointmentWithRelations>(`/api/appointments/${id}`, {
    method: "GET",
    cache: "no-store",
  });
}

export function startAppointment(id: string, staffId?: string) {
  return apiClient(`/api/appointments/${id}/start`, {
    method: "POST",
    body: { staffId },
  });
}

export function pauseAppointment(id: string, staffId?: string) {
  return apiClient(`/api/appointments/${id}/pause`, {
    method: "POST",
    body: { staffId },
  });
}

export function completeAppointment(id: string, staffId?: string) {
  return apiClient(`/api/appointments/${id}/complete`, {
    method: "POST",
    body: { staffId },
  });
}

export function saveVisitNote(
  appointmentId: string,
  body: {
    content: string;
    images?: Array<{ url: string; fileKey?: string | null }>;
  },
) {
  return apiClient(`/api/appointments/${appointmentId}/visit-note`, {
    method: "POST",
    body,
  });
}

export function updateAppointmentChecklistItem(
  appointmentId: string,
  body: {
    itemId: string;
    completed: boolean;
  },
) {
  return apiClient(`/api/appointments/${appointmentId}/checklist`, {
    method: "PATCH",
    body,
  });
}

export function runTaskAssistantPreview(body: {
  addressId: string;
  appointmentStart: string;
  appointmentEnd: string;
  mode?: "plan" | "complete";
  includePreviousVisit?: boolean;
  staffNoteDraft?: string | null;
  jobTitle?: string;
  clientName?: string;
  requiredStaffCount?: number;
}): Promise<TaskAssistantResponse> {
  return apiClient<TaskAssistantResponse>("/api/ai/task-assistant", {
    method: "POST",
    body,
  });
}

export function runStaffRecommendationPreview(body: {
  appointmentStart: string;
  appointmentEnd: string;
  jobTitle?: string;
  candidateData: CandidateResponse["data"];
}): Promise<StaffRecommendationResponse> {
  return apiClient<StaffRecommendationResponse>(
    "/api/ai/staff-recommendation",
    {
      method: "POST",
      body,
    },
  );
}
