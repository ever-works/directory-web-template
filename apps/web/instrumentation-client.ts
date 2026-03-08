import * as Sentry from '@sentry/nextjs';
import { Replay } from '@sentry/replay';
import { SENTRY_DSN, SENTRY_DEBUG, SENTRY_ENABLED } from '@/lib/constants';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || !SENTRY_ENABLED) return;

  Sentry.init({
    dsn: SENTRY_DSN.value,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Only enable debug mode when explicitly enabled
    debug: SENTRY_DEBUG.value === 'true',

    // Session replay configuration - reduce sampling in production
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      new Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Add router transition instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart; 