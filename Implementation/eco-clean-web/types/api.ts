export type PaginationMeta =
  | { total: number }
  | { page: number; limit: number; total: number; totalPages: number };

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListResponse<T> {
  data: T[];
}
