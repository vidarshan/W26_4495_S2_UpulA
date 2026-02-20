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

export interface StaffMember {
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
  staff: StaffMember[];
  completionSent: boolean;
  reminder1dSent: boolean;
  reminder5dSent: boolean;
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
