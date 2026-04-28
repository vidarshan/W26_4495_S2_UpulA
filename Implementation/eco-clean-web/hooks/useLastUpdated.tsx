import { useQueryClient, QueryKey } from "@tanstack/react-query";

export const useLastUpdated = (queryKey: QueryKey) => {
  const queryClient = useQueryClient();

  const updatedAt =
    queryClient.getQueryState(queryKey)?.dataUpdatedAt;

  return updatedAt ?? null;
};