import { SortOrder } from "@/types";

export const queryKeys = {
  clients: {
    all: ["clients"] as const,
    list: (params: {
      query?: string;
      page?: number;
      limit?: number;
      sort?: SortOrder;
    }) => ["clients", "list", params] as const,
    detail: (id?: string | null) => ["clients", "detail", id ?? null] as const,
  },
  jobs: {
    all: ["jobs"] as const,
    detail: (id?: string | null) => ["jobs", "detail", id ?? null] as const,
  },
  appointments: {
    all: ["appointments"] as const,
    detail: (id?: string | null) =>
      ["appointments", "detail", id ?? null] as const,
  },
  staff: {
    list: (params: {
      q?: string;
      page?: number;
      limit?: number;
      sort?: SortOrder;
      paginate?: boolean;
    }) => ["staff", "list", params] as const,
  },
};
