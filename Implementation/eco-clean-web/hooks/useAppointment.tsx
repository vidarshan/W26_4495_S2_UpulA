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
  const baseInterval = options?.intervalMs ?? 10000;

  return useQuery<AppointmentWithRelations>({
    queryKey: queryKeys.appointments.detail(id),
    queryFn: () => getAppointmentById(id!),
    enabled: !!id,

    refetchOnWindowFocus: live,

    refetchInterval: (query) => {
      if (!live || visibility !== "visible") return false;

      const data = query.state.data as AppointmentWithRelations | undefined;

      if (!data) return baseInterval;

      const isFinished =
        data.status === "COMPLETED" || data.status === "CANCELLED";

      if (isFinished) return false;

      const isActive = data.workSessions?.some((s) => !s.endedAt);

      if (isActive) return 30000;
      return 60000;
    },
  });
};
