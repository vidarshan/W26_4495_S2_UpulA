import { Job } from "@/types";
import { apiClient } from "./client";

export type CreateJobPayload = {
  title: string;
  clientId: string;
  addressId: string;
  jobType: "ONE_OFF" | "RECURRING";
  isAnytime: boolean;
  visitInstructions?: string;

  lineItems: Array<{
    name: string;
    quantity: number;
    unitCost?: number | null;
    unitPrice?: number | null;
    description?: string;
  }>;

  recurrence?: {
    frequency: "weekly" | "monthly";
    interval: number;
    endType: "after" | "on";
    endsAfter?: number | null;
    endsOn?: string | null;
  };

  appointments: Array<{
    date: string;
    startTime: string | null;
    endTime: string | null;
    staffIds: string[];
    note?: string | null;
    images?: Array<{ url: string; fileKey?: string | null }>;
  }>;
};

export interface JobFormValues {
  title: string;
  clientId: string;
  staffId: string[];
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
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  description: string;
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

export async function getJobDetails(id: string): Promise<Job> {
  const res = await fetch(`/api/jobs/${id}`);

  if (!res.ok) {
    throw new Error("Failed to fetch job");
  }

  return res.json() as Promise<Job>;
}

export function cancelJob(id: string) {
  return apiClient(`/api/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify("CANCEL_JOBS"),
  });
}
