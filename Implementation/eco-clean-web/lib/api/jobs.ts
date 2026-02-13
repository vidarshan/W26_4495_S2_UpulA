import { apiClient } from "./client";

export interface CreateJobPayload {
  title: string;
  clientId: string;
  staffId?: string;
  addressId?: string;
  jobType: JobType;
  startDate: Date;
  startTime?: string;
  endTime?: string;
  isAnytime?: boolean;
  recurrence?: {
    frequency: string;
    interval: number;
    endType: "after" | "on";
    endsAfter: number;
    endsUnit: "weeks" | "months";
    endsOn: Date | null;
  };
  visitInstructions?: string;
}

export interface JobFormValues {
  title: string;
  clientId: string;
  staffId: string;
  addressId: string;
  jobType: "ONE_OFF" | "RECURRING";

  startDate: Date | null;
  startTime: string;
  endTime: string;
  isAnytime: boolean;

  visitInstructions: string;

  recurrence: {
    frequency: string;
    interval: number;
    endType: "after" | "on";
    endsAfter: number;
    endsUnit: "weeks" | "months";
    endsOn: Date | null;
  };

  lineItems: LineItem[];
  notes: string;
}

export interface LineItem {
  name: string;
  quantity: number;
  unitCost?: number;
  unitPrice?: number;
}

type JobType = "ONE_OFF" | "RECURRING";

export function createJob(data: CreateJobPayload) {
  return apiClient("/api/jobs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getJobs() {
  return apiClient("/api/jobs");
}
