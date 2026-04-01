'use client';

import React from 'react';
import { QueryClientProvider as ReactQueryClientProvider, dehydrate } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/query-client';

interface QueryProviderProps {
  children: React.ReactNode;
  dehydratedState?: unknown;
}

export function QueryClientProvider({ children, dehydratedState }: QueryProviderProps) {
  // Use useState to ensure the query client is only created once on the client
  // and a new one is created for each request on the server.
  const [queryClient] = React.useState(() => {
    const client = getQueryClient();
    
    // Apply dehydrated state if provided during initialization
    if (dehydratedState && client) {
      client.setDefaultOptions({
        queries: {
          ...client.getDefaultOptions().queries,
          initialData: () => {
            return typeof dehydratedState === 'object' ? dehydratedState : undefined;
          },
        },
      });
    }
    
    return client;
  });

  return (
    <ReactQueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </ReactQueryClientProvider>
  );
}
export { dehydrate };
