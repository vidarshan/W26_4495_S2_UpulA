export type GetClientsParams = {
  q?: string;
  page?: number;
  limit?: number;
};

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
  return apiClient(`/api/clients?q=${encodeURIComponent(query)}`);
}

export function getClientAddresses(clientId: string) {
  console.log("Fetching addresses for client ID:", clientId);
  return apiClient(`/api/clients/${clientId}/addresses`);
}

