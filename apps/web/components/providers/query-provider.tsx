'use client';

import React from 'react';
import { QueryClient, QueryClientProvider as ReactQueryClientProvider, dehydrate } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/query-client';

interface QueryProviderProps {
  children: React.ReactNode;
  dehydratedState?: unknown;
}

export function QueryClientProvider({ children, dehydratedState }: QueryProviderProps) {
  const queryClientRef = React.useRef<QueryClient>(getQueryClient() || new QueryClient());
  
  if (!queryClientRef.current) {
    queryClientRef.current = getQueryClient();
    
    if (dehydratedState) {
      queryClientRef.current.setDefaultOptions({
        queries: {
          ...queryClientRef.current.getDefaultOptions().queries,
          initialData: () => {
            return typeof dehydratedState === 'object' ? dehydratedState : undefined;
          },
        },
      });
    }
  }

  return (
    <ReactQueryClientProvider client={queryClientRef.current}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </ReactQueryClientProvider>
  );
}
export { dehydrate };
