import { useQuery } from "@tanstack/react-query";

export type Status = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "LATE";


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

export type AppointmentAssignment = {
  id: string;
  appointmentId?: string;
  staffId: string;
  status?: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  staff: StaffUser;
};

type JobClient = {
  id: string;
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  preferredContact?: string | null;
};

type JobAddress = {
  id: string;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

type JobNoteImage = {
  id: string;
  url: string;
  fileKey?: string | null;
};

export type JobNote = {
  id: string;
  title: string | null;
  content: string | null;
  category: string | null;
  isClientVisible: boolean;
  isPinned: boolean;
  createdAt: string;
  images?: JobNoteImage[];
};

type JobLineItem = {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  total: number;
  description?: string | null;
};

export type AppointmentWithRelations = {
  id: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "LATE";
  jobId: string;
  createdAt: string;
  job?: {
    id: string;
    title: string;
    type: string;
    isAnytime?: boolean;
    visitInstructions?: string | null;
    client?: JobClient | null;
    address?: JobAddress | null;
    lineItems?: JobLineItem[];
    notes?: JobNote[];
  };
  assignments: AppointmentAssignment[];
  staff: StaffUser[]; // keep this because your backend is returning derived staff too
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
