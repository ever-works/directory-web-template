/**
 * Custom API hooks for handling requests and mutations
 * 
 * @example Using useQueryWithConfig
 * ```tsx
 * const { data, isLoading } = useQueryWithConfig({
 *   endpoint: '/api/users',
 *   params: { role: 'admin' }
 * });
 * ```
 * 
 * @example Using usePaginatedQuery
 * ```tsx
 * const { 
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage
 * } = usePaginatedQuery({
 *   endpoint: '/api/posts',
 *   limit: 20,
 *   sort: 'createdAt',
 *   order: 'desc'
 * });
 * ```
 * 
 * @example Using useMutationWithToast
 * ```tsx
 * const { mutate, isLoading } = useMutationWithToast({
 *   endpoint: '/api/users',
 *   method: 'post',
 *   successMessage: 'User created successfully',
 *   invalidateQueries: ['users']
 * });
 * 
 * // Usage
 * mutate({ name: 'John Doe', email: 'john@example.com' });
 * ```
 */

export * from './use-query-with-config';
export * from './use-query-with-pagination';
export * from './use-mutation-with-toast'; 