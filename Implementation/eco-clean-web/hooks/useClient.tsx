import { PaginatedResponse, Client, SortOrder } from "@/types";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

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
    queryKey: ["clients", { query, page, limit, sort }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (page) params.set("page", String(page));
      if (limit) params.set("limit", String(limit));
      params.set("sort", sort);

      const res = await fetch(`/api/clients?${params}`);

      if (!res.ok) {
        throw new Error("Failed to fetch clients");
      }

      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}
