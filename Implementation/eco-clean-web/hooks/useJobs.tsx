import { Job } from "@prisma/client";
import { useEffect, useState } from "react";

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);

      const res = await fetch(`/api/jobs`);
      const data = await res.json();

      setJobs(data.data);
      setLoading(false);
    };

    fetchJobs();
  }, []);

  return { jobs, loading };
}
