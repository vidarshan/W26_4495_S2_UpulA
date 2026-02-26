import { Client } from "@/app/components/tables/ClientTable";
import { ListResponse } from "@/app/types/api";
import { Address } from "@/types";

export type CreateClientPayload = {
  title?: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone: string;
  email: string;
  preferredContact: string;
  leadSource?: string;
  note?: string;
  addresses: {
    id?: string;
    street1: string;
    street2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  }[];
};

export type ClientWithRelations = {
  id: string;
  title?: string | null;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  phone: string;
  email: string;
  preferredContact: string;
  leadSource?: string | null;
  createdAt: string;
  addresses: {
    id: string;
    street1: string;
    street2?: string | null;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  }[];
  notes?: {
    id: string;
    content: string;
  }[];
};

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

type ApiClientOptions<TBody = unknown> = Omit<RequestInit, "body"> & {
  body?: TBody;
};

type ApiErrorShape = { error?: string };

export async function apiClient<TResponse, TBody = unknown>(
  url: string,
  options: ApiClientOptions<TBody> = {},
): Promise<TResponse> {
  const { body, headers, ...rest } = options;

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (data as ApiErrorShape | null)?.error;
    throw new Error(err || "Request failed");
  }

  return data as TResponse;
}
export function getClients(query: string) {
  return apiClient<ClientsResponse>(
    `/api/clients?q=${encodeURIComponent(query)}`,
  );
}

export function getClientAddresses(clientId: string) {
  return apiClient<ListResponse<Address>>(`/api/clients/${clientId}/addresses`);
}

export function updateClient(id: string, payload: CreateClientPayload) {
  return apiClient<ClientWithRelations, CreateClientPayload>(
    `/api/clients/${id}`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export function createClient(payload: CreateClientPayload) {
  return apiClient<ClientWithRelations>("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
