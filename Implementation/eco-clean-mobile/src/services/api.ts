import { API_BASE_URL } from "@/config/env";

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: any;
};

export async function apiFetch(endpoint: string, options: ApiOptions = {}) {
  if (!API_BASE_URL) {
    throw new ApiError("API_BASE_URL is undefined", 0);
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(
      data?.error || data?.message || "Request failed",
      res.status,
      data,
    );
  }

  return data;
}

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}
