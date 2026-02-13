import { apiClient } from "./client";

export function getStaff() {
  return apiClient("/api/users");
}
