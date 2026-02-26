export type CalendarSelection = {
  start: Date | null;
  end: Date | null;
  startStr: string;
  endStr: string;
  allDay: boolean;
};

export interface Client {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string;
  phone: string;
  preferredContact: "email" | "phone";
  leadSource: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface User {
  id: string;
  name: string;
  email: string;
  role: "STAFF" | "ADMIN";
  createdAt: string;
}

export interface Appointment {
  id: string;
  jobId: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  staff: User[];
  completionSent: boolean;
  reminder1dSent: boolean;
  reminder5dSent: boolean;
}

export interface UserForm {
  email: string;
  name: string;
  password: string;
  role: "STAFF" | "ADMIN";
}

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
  description: string;
}

export interface Note {
  id: string;
  jobId: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface Job {
  id: string;
  title: string;
  type: "ONE_OFF" | "RECURRING";
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
  notes: Note[];
}

export interface UpdateAppointmentPayload {
  date?: string | Date | null;
  startTime?: string;
  endTime?: string;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  staffIds?: string[];
}

export type PaginationMeta =
  | { total: number }
  | { page: number; limit: number; total: number; totalPages: number };

export type UserListResponse = {
  data: User[];
  meta: PaginationMeta;
};

export type EditUserInput = {
  id: string;
  name: string;
  role: string;
  email: string;
};

export type ParsedSelection = {
  // Raw Date objects
  startDate: Date;
  endDate: Date;

  // ISO strings (UTC)
  startISO: string;
  endISO: string;

  // Original timezone-preserved strings
  startWithOffset: string;
  endWithOffset: string;

  // Timestamps
  startTimestamp: number;
  endTimestamp: number;

  // Date-only strings
  startDateOnly: string;
  endDateOnly: string;

  // Time parts (local)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"

  durationInMinutes: number;

  allDay: boolean;
};

export type Role = "ADMIN" | "STAFF";
