import { apiClient } from "./client";

export type UpdateAppointmentPayload = Partial<{
  startTime: string; // ISO
  endTime: string; // ISO
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
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
