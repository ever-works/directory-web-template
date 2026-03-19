'use server';

import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, SENTRY_DEBUG } from '@/lib/constants';
import { initializeDatabase } from '@/lib/db/initialize';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const isVercelProduction = process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production';
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const enableRuntimeDbInit = process.env.ENABLE_RUNTIME_DB_INIT === 'true';
  const failOnRuntimeDbInit = process.env.FAIL_ON_RUNTIME_DB_INIT === 'true';

  // Only initialize Sentry if DSN is configured
  if (SENTRY_DSN.value) {
    Sentry.init({
      dsn: SENTRY_DSN.value,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Only enable debug mode when explicitly enabled
      debug: SENTRY_DEBUG.value === 'true',
    });
  }

  // Auto-initialize database (migrate and seed if needed)
  // Note: Build-time migrations via scripts/build-migrate.ts are preferred for Vercel.
  // On Vercel production, skip runtime DB initialization by default and rely on build-time
  // migrations instead. Runtime DB init can be re-enabled explicitly via env when needed.
  if (isVercelProduction && !enableRuntimeDbInit && !failOnRuntimeDbInit) {
    console.log('[Instrumentation] Skipping runtime database initialization on Vercel production');
    return;
  }

  // This runtime migration serves as a fallback for preview deployments and optional setups.
  try {
    console.log('[Instrumentation] Running database initialization...');
    await initializeDatabase();
    console.log('[Instrumentation] Database initialization completed');
  } catch (error) {
    console.error('[Instrumentation] ❌ Database initialization failed:', error);

    // Log detailed error for debugging in Vercel logs
    if (error instanceof Error) {
      console.error('[Instrumentation] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Report to Sentry if configured
      if (SENTRY_DSN.value) {
        Sentry.captureException(error, {
          tags: {
            component: 'instrumentation',
            phase: 'database_init',
            environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'
          }
        });
      }
    }

    // Non-Vercel production keeps fail-fast behavior. Vercel production can opt back into
    // strict runtime failure with FAIL_ON_RUNTIME_DB_INIT=true.
    if ((isProduction && !isVercelProduction) || failOnRuntimeDbInit) {
      console.error('[Instrumentation] ❌ Fatal database initialization failure during production startup');
      throw error;
    }

    // Default behavior: allow app startup and let DB-dependent routes fail gracefully.
    console.warn('[Instrumentation] ⚠️  Allowing app to start despite DB init failure');
    console.warn('[Instrumentation] ⚠️  Database-dependent routes may return errors until the database is fixed');
  }
}

// Add hook to capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
