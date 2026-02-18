import { apiClient } from "./client";

export function cancelAppointment(id: string) {
  return apiClient(`/api/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "CANCELLED" }),
  });
}

export function rescheduleAppointment(
  id: string,
  newStart: Date | null,
  newEnd: Date | null,
) {
  return apiClient(`/api/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ startTime: newStart, endTime: newEnd }),
  });
}
