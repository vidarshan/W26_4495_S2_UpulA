import { useQuery } from "@tanstack/react-query";

export type VisitNote = {
  id: string;
  content: string;
  createdAt: string;
  isClientVisible: boolean;
};

export type AppointmentImage = {
  id: string;
  url: string;
  fileKey?: string | null;
};

export type StaffUser = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

export type AppointmentWithRelations = {
  id: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  jobId: string;

  staff: StaffUser[];
  notes: VisitNote[];
  images: AppointmentImage[];
};

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
