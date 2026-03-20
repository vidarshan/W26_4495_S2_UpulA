import { apiClient } from "./client";

export type UpdateAppointmentPayload = Partial<{
  startTime: string; // ISO
  endTime: string; // ISO
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "LATE";
  staffIds: string[];
  note: string | null;
}>;

export function updateAppointment(
  id: string,
  payload: UpdateAppointmentPayload,
) {
  return apiClient(`/api/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function cancelAppointment(id: string) {
  return updateAppointment(id, { status: "CANCELLED" });
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

export async function getAppointmentById(id: string) {
  const res = await fetch(`/api/appointments/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to fetch appointment");
  }
  return res.json();
}

export async function startAppointment(id: string, staffId?: string) {
  const res = await fetch(`/api/appointments/${id}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error || "Failed to start appointment");
  }

  return json;
}

export async function pauseAppointment(id: string, staffId?: string) {
  const res = await fetch(`/api/appointments/${id}/pause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error || "Failed to pause appointment");
  }

  return json;
}

export async function completeAppointment(id: string) {
  const res = await fetch(`/api/appointments/${id}/complete`, {
    method: "POST",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error || "Failed to complete appointment");
  }

  return json;
}

export async function saveVisitNote(
  appointmentId: string,
  body: {
    content: string;
    images?: Array<{ url: string; fileKey?: string | null }>;
  },
) {
  const res = await fetch(`/api/appointments/${appointmentId}/visit-note`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Failed to save visit note");
  }

  return data;
}
