import { useQuery } from "@tanstack/react-query";
import { getStaff } from "@/lib/api/users";

export function useUsers(page: number, limit: number) {
  return useQuery({
    queryKey: ["users", page, limit], 
    queryFn: () => getStaff(page, limit),
    keepPreviousData: true, 
  });
}
