import { Job, LineItem as SharedLineItem, ListResponse } from "@/types";
import { apiClient } from "./client";

export type CreateJobPayload = {
  title: string;
  clientId: string;
  addressId: string;
  jobType: "ONE_OFF" | "RECURRING";
  isAnytime: boolean;
  visitInstructions?: string;
  notes?: {
    title?: string;
    content: string;
    category?:
      | "GENERAL"
      | "ACCESS"
      | "CLEANING"
      | "SAFETY"
      | "SUPPLIES"
      | "CLIENT_PREFERENCE";
    isClientVisible?: boolean;
    isPinned?: boolean;
    images?: {
      url: string;
      fileKey?: string;
    }[];
  }[];
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

export type UpdateJobPayload = {
  title: string;
  clientId: string;
  addressId: string;
  isAnytime: boolean;
  visitInstructions?: string | null;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitCost?: number | null;
    unitPrice?: number | null;
    description?: string | null;
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

export type LineItem = SharedLineItem;

export function createJob(data: CreateJobPayload) {
  return apiClient("/api/jobs", {
    method: "POST",
    body: data,
  });
}

export function getJobs() {
  return apiClient<ListResponse<Job>>("/api/jobs");
}

export function getJobDetails(id: string) {
  return apiClient<Job>(`/api/jobs/${id}`);
}

export function cancelJob(id: string) {
  return apiClient(`/api/jobs/${id}`, {
    method: "PATCH",
    body: "CANCEL_JOBS",
  });
}

export function updateJob(id: string, data: UpdateJobPayload) {
  return apiClient<Job, UpdateJobPayload>(`/api/jobs/${id}`, {
    method: "PATCH",
    body: data,
  });
}
