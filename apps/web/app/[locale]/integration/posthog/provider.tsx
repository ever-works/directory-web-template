'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    analytics.init();
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
