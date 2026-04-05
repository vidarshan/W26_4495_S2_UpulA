import { PaginatedResponse } from "@/app/types/api";
import { apiClient } from "./client";
import { Staff } from "@/app/types/staff";
import { User } from "@/types";

export function getStaff(params?: {
  q?: string;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
  paginate?: boolean;
}) {
  const sp = new URLSearchParams();

  if (params?.q) sp.set("q", params.q);
  if (params?.sort) sp.set("sort", params.sort);

  const paginate = params?.paginate ?? false;
  sp.set("paginate", paginate ? "true" : "false");

  if (paginate) {
    sp.set("page", String(params?.page ?? 1));
    sp.set("limit", String(params?.limit ?? 20));
  }

  return apiClient<any>(`/api/users?${sp.toString()}`).then((res) => {
    const users = res?.data ?? res;

    return (users || [])
      .filter((u: any) => u.role === "STAFF")
      .map(
        (u: any): Staff => ({
          id: u.id,
          name: u.name ?? "",
          email: u.email ?? "",
          role: u.role,
          createdAt: u.createdAt ?? new Date().toISOString(),
        })
      );
  });
}

export async function getAvailableStaff({
  date,
  startTime,
  endTime,
  q,
}: {
  date: string | null;
  startTime: string;
  endTime: string;
  q?: string;
}) {
  if (!date || !startTime || !endTime) return [];

  const params = new URLSearchParams({
    date,
    startTime,
    endTime,
  });

  if (q) params.append("q", q);

  const res = await fetch(`/api/staff/available?${params.toString()}`);

  if (!res.ok) {
    throw new Error("Failed to fetch available staff");
  }

  return res.json();
}

export function createUser(name: string, role: string, email: string) {
  return apiClient<{ user: User; temporaryPassword: string }>(`/api/users`, {
    method: "POST",
    body: { name, role, email },
  });
}

type UserPayload = {
  name: string;
  role: Role;
  email: string;
  password?: string;
};

type Role = "ADMIN" | "STAFF";

export function editUser(
  id: string,
  name: string,
  role: Role,
  email: string,
  password?: string,
) {
  const body: UserPayload = { name, role, email };

  if (password) body.password = password;

  return apiClient(`/api/users/${id}`, {
    method: "PATCH",
    body,
  });
}