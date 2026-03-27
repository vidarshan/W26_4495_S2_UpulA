import { getJobDetails } from "@/lib/api/jobs";
import { queryKeys } from "@/lib/queryKeys";
import { Job } from "@/types";
import { useQuery } from "@tanstack/react-query";

export function useJob(id: string) {
  return useQuery<Job>({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => getJobDetails(id),
    enabled: !!id,
  });
}
