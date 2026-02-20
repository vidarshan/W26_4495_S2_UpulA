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
