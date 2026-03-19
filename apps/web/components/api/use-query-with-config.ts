import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { QueryParams, fetcherGet } from '@/lib/api/api-client';
import { QUERY_CONFIG } from '@/lib/api/constants';

interface UseQueryWithConfigOptions<T> extends Omit<
  UseQueryOptions<T, Error, T, [string, QueryParams | undefined]>,
  'queryKey' | 'queryFn'
> {
  endpoint: string;
  params?: QueryParams;
  enabled?: boolean;
}

export function useQueryWithConfig<T>({
  endpoint,
  params,
  enabled = true,
  ...options
}: UseQueryWithConfigOptions<T>) {
  return useQuery<T, Error, T, [string, QueryParams | undefined]>({
    queryKey: [endpoint, params],
    queryFn: () => fetcherGet<T>(endpoint, params),
    ...QUERY_CONFIG,
    ...options,
    enabled
  });
} 