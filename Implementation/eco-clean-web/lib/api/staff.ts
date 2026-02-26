import { apiClient } from "./client";

import type { UserListResponse } from "@/types";

export function getStaff(params: {
  q?: string;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
  paginate?: boolean;
}) {
  const sp = new URLSearchParams();

  if (params.q) sp.set("q", params.q);
  if (params.sort) sp.set("sort", params.sort);

  const paginate = params.paginate ?? true;
  sp.set("paginate", paginate ? "true" : "false");

  if (paginate) {
    sp.set("page", String(params.page ?? 1));
    sp.set("limit", String(params.limit ?? 20));
  }

  return apiClient<UserListResponse>(`/api/users?${sp.toString()}`);
}
