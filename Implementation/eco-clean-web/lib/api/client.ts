import { Client } from "@/app/components/tables/ClientTable";
import { ListResponse } from "@/app/types/api";
import { Address } from "@prisma/client";

export type GetClientsParams = {
  q?: string;
  page?: number;
  limit?: number;
};

export interface ApiListResponse<T> {
  data: T[];
}

export interface ClientsResponse {
  data: Client[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AddressResponse {
  id: string;
  street1: string;
  city: string;
  province: string;
}

export interface StaffResponse {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function apiClient<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.error || "Something went wrong");
  }

  return data;
}

export function getClients(query: string) {
  return apiClient<ClientsResponse>(
    `/api/clients?q=${encodeURIComponent(query)}`,
  );
}

export function getClientAddresses(clientId: string) {
  return apiClient<ListResponse<Address>>(`/api/clients/${clientId}/addresses`);
}
