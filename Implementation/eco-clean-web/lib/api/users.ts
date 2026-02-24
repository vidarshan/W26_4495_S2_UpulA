import { PaginatedResponse } from "@/app/types/api";
import { apiClient } from "./client";
import { User } from "@/app/types/staff";

export function getStaff() {
  return apiClient<PaginatedResponse<User>>("/api/users");
}
