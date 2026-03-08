import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { PaginatedResponse, PaginationParams, QueryParams, fetcherPaginated } from '@/lib/api/api-client';
import { QUERY_CONFIG } from '@/lib/api/constants';

interface UsePaginatedQueryOptions<T> extends Omit<
  UseInfiniteQueryOptions<
    PaginatedResponse<T>,
    Error,
    PaginatedResponse<T>,
    [string, PaginationParams & QueryParams],
    number
  >,
  'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
> {
  endpoint: string;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: QueryParams;
  enabled?: boolean;
}

export function usePaginatedQuery<T>({
  endpoint,
  limit = 10,
  sort,
  order,
  filters = {},
  enabled = true,
  ...options
}: UsePaginatedQueryOptions<T>) {
  return useInfiniteQuery<
    PaginatedResponse<T>,
    Error,
    PaginatedResponse<T>,
    [string, PaginationParams & QueryParams],
    number
  >({
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
    getNextPageParam: (lastPage) => {
      if (!lastPage.success) return undefined;
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
    ...QUERY_CONFIG,
    ...options,
    enabled
  });
}

export function extractAllItems<T>(pages?: PaginatedResponse<T>[]): T[] {
  if (!pages) return [];
  return pages.flatMap(page => page.success ? page.data : []);
}

export function getTotalItems<T>(pages?: PaginatedResponse<T>[]): number {
  if (!pages?.length || !pages[0].success) return 0;
  return pages[0].meta.total;
} 