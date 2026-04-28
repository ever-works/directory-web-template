'use client';

import { useMemo } from 'react';
import { analytics } from '@/lib/analytics';
import { AnalyticsEvent } from '@/lib/analytics/types';

/**
 * useAnalytics Hook
 * 
 * Provides a type-safe and consistent way to access analytics methods 
 * from any Client Component.
 * 
 * @example
 * ```tsx
 * const { track, identify } = useAnalytics();
 * 
 * // Using standard events
 * track(AnalyticsEvent.PURCHASE_COMPLETED, { amount: 99, currency: 'USD' });
 * 
 * // Using custom strings (if needed)
 * track('custom_special_event', { foo: 'bar' });
 * ```
 */
export function useAnalytics() {
  const actions = useMemo(() => ({
    /**
     * Track a custom event.
     * Prefers AnalyticsEvent enum for consistency.
     */
    track: (eventName: AnalyticsEvent | string, properties?: Record<string, any>) => {
      analytics.track(eventName as string, properties);
    },

    /**
     * Identify the current user.
     * Call this after login or when user data is available.
     */
    identify: (userId: string, properties?: Record<string, any>) => {
      analytics.identify(userId, properties);
    },

    /**
     * Capture an exception and send it to enabled providers (PostHog/Sentry).
     */
    captureException: (error: Error | string, context?: Record<string, any>) => {
      analytics.captureException(error, context);
    },

    /**
     * Reset user identity (call this at logout).
     */
    reset: () => {
      analytics.reset();
    },

    /**
     * Set properties for the current user profile.
     */
    setUserProperties: (properties: Record<string, any>) => {
      analytics.setUserProperties(properties);
    },

    /**
     * Check if a PostHog feature flag is enabled.
     */
    isFeatureEnabled: (flagKey: string, defaultValue = false) => {
      return analytics.isFeatureEnabled(flagKey, defaultValue);
    }
  }), []);

  return actions;
}