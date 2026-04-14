export type UserRole = "ADMIN" | "STAFF" | "CLIENT";
export type StaffRole = Exclude<UserRole, "CLIENT">;
export type AppointmentStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "LATE";
export type JobType = "ONE_OFF" | "RECURRING";
export type SortOrder = "newest" | "oldest";

export type CalendarSelection = {
  start: Date | null;
  end: Date | null;
  startStr: string;
  endStr: string;
  allDay: boolean;
};

export type ParsedSelection = {
  startDate: Date;
  endDate: Date;
  startISO: string;
  endISO: string;
  startWithOffset: string;
  endWithOffset: string;
  startTimestamp: number;
  endTimestamp: number;
  startDateOnly: string;
  endDateOnly: string;
  startTime: string;
  endTime: string;
  durationInMinutes: number;
  allDay: boolean;
};

export interface Address {
  id: string;
  clientId: string;
  street1: string;
  street2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
  isBilling: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  title?: string | null;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  email: string;
  phone: string;
  preferredContact: string;
  leadSource?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type StaffLocationAddress = {
  street1: string | null;
  street2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  createdAt: string;
  lastKnownJobLocation?: StaffLocationAddress | null;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastKnownJobLocation?: StaffLocationAddress | null;
}

export interface StaffSuggestion {
  staff: Staff;
  reason: string;
}

export type StaffUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: UserRole | string | null;
  createdAt?: string;
  lastKnownJobLocation?: StaffLocationAddress | null;
};

export type AppointmentImage = {
  id: string;
  url: string;
  fileKey?: string | null;
};

export type NoteImage = {
  id: string;
  url: string;
  fileKey?: string | null;
};

export type VisitNote = {
  id: string;
  content: string;
  createdAt: string;
  isClientVisible: boolean;
  images?: NoteImage[];
};

export type JobNote = {
  id: string;
  title: string | null;
  content: string | null;
  category: string | null;
  isClientVisible: boolean;
  isPinned: boolean;
  createdAt: string;
  images?: NoteImage[];
};

export interface Recurrence {
  id: string;
  frequency: "weekly" | "monthly";
  interval: number;
  endType: "after" | "on";
  endsAfter?: number;
  endsUnit?: "weeks" | "months";
  endsOn?: string | null;
}

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  total?: number | null;
  description: string;
}

export type JobClient = {
  id: string;
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  preferredContact?: string | null;
};

export type JobAddress = {
  id: string;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type AppointmentAssignment = {
  id: string;
  appointmentId?: string;
  staffId: string;
  isTeamLead?: boolean;
  status?: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  staff: StaffUser;
};

export type WorkSession = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  appointmentId: string;
  staffId: string;
  staff?: StaffUser;
};

export type AppointmentChecklistItem = {
  id: string;
  appointmentId: string;
  label: string;
  sortOrder: number;
  isCompleted: boolean;
  completedAt: string | null;
  completedById?: string | null;
};

export interface Appointment {
  id: string;
  jobId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  createdAt: string;
  staff: User[];
  completionSent: boolean;
  reminder1dSent: boolean;
  reminder5dSent: boolean;
}

export interface Job {
  id: string;
  title: string;
  type: JobType;
  clientId: string;
  addressId: string;
  createdAt: string;
  updatedAt: string;
  isAnytime: boolean;
  visitInstructions: string;
  client: Client;
  address: Address;
  lineItems: LineItem[];
  recurrence: Recurrence | null;
  appointments: Appointment[];
  notes: JobNote[];
}

export type AppointmentWithRelations = {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
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
    lineItems?: LineItem[];
    notes?: JobNote[];
    recurrence?: Recurrence | null;
  };
  assignments: AppointmentAssignment[];
  staff: StaffUser[];
  notes: VisitNote[];
  images: AppointmentImage[];
  workSessions?: WorkSession[];
  checklistItems?: AppointmentChecklistItem[];
};

export type CandidateStaff = Staff & {
  leaves?: Array<{
    id: string;
    type: string;
    startAt: string;
    endAt: string;
  }>;
  assignments?: Array<{
    id: string;
    status: string;
    appointment: {
      id: string;
      startTime: string;
      endTime: string;
    };
  }>;
};

export type CandidateRecommendation = {
  staff: Staff;
  reason: string;
};

export type CandidateResponse = {
  data: {
    jobLocation: {
      id: string;
      street1?: string | null;
      city?: string | null;
      province?: string | null;
    } | null;
    recommendedMembers: CandidateRecommendation[];
    staffMembers: CandidateStaff[];
  };
  meta: { total: number };
};

export type AssignmentInsightContext = {
  appointmentDate: Date;
  appointmentStart: string;
  appointmentEnd: string;
};

export type AssignmentInsightFields = {
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  durationMinutes: number;

  jobTitle: string;
  clientName: string;

  propertyAddress: {
    street1: string;
    city: string;
    province: string;
    postalCode: string;
  } | null;

  requiredStaffCount: number;

  staff: {
    id: string;
    name: string;

    lastKnownJobLocation: {
      city: string;
      province: string;
      postalCode: string;
      street1: string;
    } | null;

    staffProfile: {
      position: string;
      hourlyRate: number;
      staffAddress: {
        city: string;
        province: string;
        postalCode: string;
        street1: string;
      };
    };

    leaves: {
      startAt: Date;
      endAt: Date;
      type: string;
    }[];

    assignments: {
      status: string;
      plannedStart: Date;
      plannedEnd: Date;
      appointment: {
        startTime: Date;
        endTime: Date;
      };
    }[];
  }[];
};

export type AssignmentCandidate = {
  staffId: string;
  name: string;

  position: string | null;
  hourlyRate: number | null;

  proximityScore: number;
  proximityOrigin: "home" | "last_job";

  hasScheduleConflict: boolean;
  hasLeaveConflict: boolean;

  assignmentsToday: number;
  totalScheduledMinutesToday: number;

  hasWorkedAtPropertyBefore: boolean;
  hasWorkedForClientBefore: boolean;
};

export interface UserForm {
  email: string;
  name: string;
  password: string;
  role: StaffRole;
}

export type EditUserInput = {
  id: string;
  name: string;
  role: string;
  email: string;
};

export type UserListResponse = {
  data: User[];
  meta: import("@/types/api").PaginationMeta;
};

export type UpdateAppointmentPayload = {
  date?: string | Date | null;
  startTime?: string;
  endTime?: string;
  status?: AppointmentStatus;
  staffIds?: string[];
};

export type BaseAppointment = {
  staffIds: string[];
};

export type PayBreakdown = {
  regularAmount?: number;
  otAmount?: number;
  transportAllowance?: number;

  federalTax?: number;
  quebecTax?: number;
  ei?: number;
  qpp?: number;
  qpp2?: number;
  qpip?: number;
};
