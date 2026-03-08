import { useInfiniteQuery } from '@tanstack/react-query';
import { PaginatedResponse, PaginationParams, QueryParams, fetcherPaginated } from '@/lib/api/api-client';

interface UsePaginatedQueryOptions {
  endpoint: string;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, string | number | boolean | undefined>;
  enabled?: boolean;
}

export function usePaginatedQuery<T>({
  endpoint,
  limit = 10,
  sort,
  order,
  filters = {},
  enabled = true,
}: UsePaginatedQueryOptions) {
  return useInfiniteQuery({
    queryKey: [endpoint, { limit, sort, order, ...filters }],
    queryFn: async ({ pageParam = 1 }) => {
      const params: PaginationParams & QueryParams = {
        page: pageParam,
        limit,
        ...(sort && { sort }),
        ...(order && { order }),
        ...filters
      };
      return fetcherPaginated<T>(endpoint, params);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedResponse<T>) => {
      if (!lastPage.success) return undefined;
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
    enabled
  });
} 