import { getJobs } from "@/lib/api/jobs";
import { Job } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: getJobs,
  });
}
