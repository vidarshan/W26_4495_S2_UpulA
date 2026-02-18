import { getJobDetails } from "@/lib/api/jobs";
import { Job } from "@/types";
import { useQuery } from "@tanstack/react-query";

export function useJob(id: string) {
  return useQuery<Job>({
    queryKey: ["job", id],
    queryFn: () => getJobDetails(id),
    enabled: !!id,
  });
}
