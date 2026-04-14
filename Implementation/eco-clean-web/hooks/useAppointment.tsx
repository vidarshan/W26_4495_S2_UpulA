import { useQuery } from "@tanstack/react-query";
import { AppointmentWithRelations } from "@/types";
import { getAppointmentById } from "@/lib/api/appointments";
import { queryKeys } from "@/lib/queryKeys";
import { useDocumentVisibility } from "@mantine/hooks";

export type Status = AppointmentWithRelations["status"];

type UseAppointmentOptions = {
  live?: boolean;
  intervalMs?: number;
};

export const useAppointment = (
  id?: string | null,
  options?: UseAppointmentOptions,
) => {
  const visibility = useDocumentVisibility();
  const live = options?.live ?? true;
  const intervalMs = options?.intervalMs ?? 3000;

  return useQuery<AppointmentWithRelations>({
    queryKey: queryKeys.appointments.detail(id),
    queryFn: () => getAppointmentById(id!),
    enabled: !!id,
    refetchInterval: live && visibility === "visible" ? intervalMs : false,
    refetchOnWindowFocus: live,
  });
};
