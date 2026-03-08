'use client';

import { PropsWithChildren } from 'react';
import { FilterProvider as FilterContextProvider } from '@/components/filters/context/filter-context';

export function FilterProvider({ children }: PropsWithChildren) {
  return <FilterContextProvider>{children}</FilterContextProvider>;
} 