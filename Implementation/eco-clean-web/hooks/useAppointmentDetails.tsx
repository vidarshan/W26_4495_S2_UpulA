"use client";

import { useAppointment } from "@/hooks/useAppointment";

export function useAppointmentDetails(id?: string) {
  return useAppointment(id);
}
