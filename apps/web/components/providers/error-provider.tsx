'use client';

import { PropsWithChildren } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';

export function ErrorProvider({ children }: PropsWithChildren) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
} 