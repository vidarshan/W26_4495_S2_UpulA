import { useQuery } from "@tanstack/react-query";
import { Appointment } from "@/types";

export const useAppointment = (id?: string | null) => {
  return useQuery({
    queryKey: ["appointment", id],
    queryFn: async () => {
      if (!id) throw new Error("No appointment ID provided");

      const res = await fetch(`/api/appointments/${id}`);
      if (!res.ok) throw new Error("Failed to fetch appointment");
      return res.json() as Promise<Appointment>;
    },
    enabled: !!id,
  });
};
