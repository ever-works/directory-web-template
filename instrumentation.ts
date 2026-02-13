'use server';

import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, SENTRY_DEBUG } from '@/lib/constants';
import { initializeDatabase } from '@/lib/db/initialize';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

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
  // Note: Build-time migrations via scripts/build-migrate.ts are preferred for Vercel
  // This runtime migration serves as a fallback for preview deployments
  try {
    console.log('[Instrumentation] Running database initialization...');
    await initializeDatabase();
    console.log('[Instrumentation] Database initialization completed');
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    
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
    
    // In production, re-throw to signal critical failure
    // This ensures Vercel health checks can detect the broken state
    if (isProduction) {
      console.error('[Instrumentation] ❌ CRITICAL: Production deployment with failed database initialization');
      console.error('[Instrumentation] ❌ This deployment should not serve traffic');
      throw error;
    }
    
    // In development/preview, allow app to start for debugging
    // but log a prominent warning
    console.warn('[Instrumentation] ⚠️  Non-production: Allowing app to start despite DB init failure');
    console.warn('[Instrumentation] ⚠️  Database-dependent routes will return errors');
  }
}

// Add hook to capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
