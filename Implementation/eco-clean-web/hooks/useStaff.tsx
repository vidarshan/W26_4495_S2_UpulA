import { PaginatedResponse, SortOrder, Staff } from "@/types";
import { getStaff } from "@/lib/api/users";
import { queryKeys } from "@/lib/queryKeys";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

type StaffParams = {
  q?: string;
  page?: number;
  limit?: number;
  sort?: SortOrder;
  paginate?: boolean;
};

export function useStaff(params: StaffParams) {
  const paginate = params.paginate ?? true;

  const keyParams = {
    q: params.q ?? "",
    sort: params.sort ?? "newest",
    paginate,
    ...(paginate ? { page: params.page ?? 1, limit: params.limit ?? 20 } : {}),
  } as const;

  return useQuery<
    PaginatedResponse<Staff>,
    Error
  >({
    queryKey: queryKeys.staff.list(keyParams),
    queryFn: () => getStaff(keyParams),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
