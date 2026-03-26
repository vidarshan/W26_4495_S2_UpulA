import { useQuery } from "@tanstack/react-query";
import { AppointmentWithRelations } from "@/types";

export type Status = AppointmentWithRelations["status"];

export const useAppointment = (id?: string | null) => {
  return useQuery<AppointmentWithRelations>({
    queryKey: ["appointment", id],
    queryFn: async () => {
      if (!id) throw new Error("No appointment ID provided");

      const res = await fetch(`/api/appointments/${id}`);
      if (!res.ok) throw new Error("Failed to fetch appointment");

      return (await res.json()) as AppointmentWithRelations;
    },
    enabled: !!id,
  });
};
