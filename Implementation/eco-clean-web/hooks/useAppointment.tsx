import { useQuery } from "@tanstack/react-query";
import { AppointmentWithRelations } from "@/types";
import { getAppointmentById } from "@/lib/api/appointments";
import { queryKeys } from "@/lib/queryKeys";

export type Status = AppointmentWithRelations["status"];

export const useAppointment = (id?: string | null) => {
  return useQuery<AppointmentWithRelations>({
    queryKey: queryKeys.appointments.detail(id),
    queryFn: () => getAppointmentById(id!),
    enabled: !!id,
  });
};
