import { PaginatedResponse, Client, SortOrder } from "@/types";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getClients } from "@/lib/api/client";
import { queryKeys } from "@/lib/queryKeys";

export function useClients({
  query,
  page,
  limit,
  sort,
}: {
  query: string;
  page: number;
  limit?: number;
  sort: SortOrder;
}) {
  return useQuery<PaginatedResponse<Client>>({
    queryKey: queryKeys.clients.list({ query, page, limit, sort }),
    queryFn: () => getClients({ q: query, page, limit, sort }),
    placeholderData: keepPreviousData,
  });
}
