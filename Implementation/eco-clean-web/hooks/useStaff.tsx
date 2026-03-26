import { PaginatedResponse, SortOrder, Staff } from "@/types";
import { getStaff } from "@/lib/api/users";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

type StaffParams = {
  q?: string;
  page?: number;
  limit?: number;
  sort?: SortOrder;
  paginate?: boolean;
};

type StaffQueryKey = readonly [
  "staff",
  {
    q: string;
    sort: SortOrder;
    paginate: boolean;
    page?: number;
    limit?: number;
  },
];

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
    Error,
    PaginatedResponse<Staff>,
    StaffQueryKey
  >({
    queryKey: ["staff", keyParams],
    queryFn: ({ queryKey }) => {
      const [, p] = queryKey;
      return getStaff(p);
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
