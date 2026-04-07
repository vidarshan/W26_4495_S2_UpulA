import { Address, Client, ListResponse, PaginatedResponse, Staff } from "@/types";

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
  sort?: "newest" | "oldest";
};

export type ClientsResponse = PaginatedResponse<Client>;

export interface AddressResponse {
  id: string;
  street1: string;
  city: string;
  province: string;
}

export type StaffResponse = Pick<Staff, "id" | "name" | "email" | "role">;

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
export function getClients(params: string | GetClientsParams = "") {
  const sp = new URLSearchParams();

  if (typeof params === "string") {
    if (params) sp.set("q", params);
  } else {
    if (params.q) sp.set("q", params.q);
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.sort) sp.set("sort", params.sort);
  }

  const query = sp.toString();

  return apiClient<ClientsResponse>(`/api/clients${query ? `?${query}` : ""}`);
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
  return apiClient<ClientWithRelations, CreateClientPayload>("/api/clients", {
    method: "POST",
    body: payload,
  });
}
