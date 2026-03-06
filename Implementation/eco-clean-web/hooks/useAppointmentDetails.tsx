"use client";

import { useQuery } from "@tanstack/react-query";
import { getAppointmentById } from "@/lib/api/appointments";

export function useAppointmentDetails(id?: string) {
  return useQuery({
    queryKey: ["appointment-details", id],
    queryFn: () => getAppointmentById(id!),
    enabled: !!id,
  });
}
