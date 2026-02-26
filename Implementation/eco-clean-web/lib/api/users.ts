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

  const paginate = params?.paginate ?? true;
  sp.set("paginate", paginate ? "true" : "false");

  if (paginate) {
    sp.set("page", String(params?.page ?? 1));
    sp.set("limit", String(params?.limit ?? 20));
  }

  return apiClient<PaginatedResponse<Staff>>(`/api/users?${sp.toString()}`);
}

export function createUser(name: string, role: string, email: string) {
  return apiClient<{ user: User; tempPassword: string }>(`/api/users`, {
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
