import { getJobs } from "@/lib/api/jobs";
import { queryKeys } from "@/lib/queryKeys";
import { Job } from "@/types";
import { useQuery } from "@tanstack/react-query";

export function useJobs() {
  const query = useQuery({
    queryKey: queryKeys.jobs.all,
    queryFn: getJobs,
    select: (response): Job[] => response.data,
  });

  return {
    ...query,
    jobs: query.data ?? [],
    loading: query.isLoading,
  };
}
