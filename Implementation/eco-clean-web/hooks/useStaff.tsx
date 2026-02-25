import { getStaff } from "@/lib/api/users";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export function useStaff(params: {
  q?: string;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
  paginate?: boolean;
}) {
  const paginate = params.paginate ?? true;

  return useQuery({
    queryKey: [
      "staff",
      {
        q: params.q ?? "",
        sort: params.sort ?? "newest",
        paginate,
        page: paginate ? (params.page ?? 1) : null,
        limit: paginate ? (params.limit ?? 20) : null,
      },
    ],
    queryFn: () => getStaff(params),
    placeholderData: keepPreviousData,
  });
}
