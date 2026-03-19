import posthog from 'posthog-js';
import type { Properties, PostHogConfig } from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { Event as SentryEvent } from '@sentry/nextjs';
import {
  POSTHOG_KEY,
  POSTHOG_HOST,
  POSTHOG_ENABLED,
  POSTHOG_DEBUG,
  POSTHOG_SESSION_RECORDING_ENABLED,
  POSTHOG_AUTO_CAPTURE,
  POSTHOG_SAMPLE_RATE,
  POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
  SENTRY_ENABLED,
  EXCEPTION_TRACKING_PROVIDER,
  POSTHOG_EXCEPTION_TRACKING,
  SENTRY_EXCEPTION_TRACKING,
  type ExceptionTrackingProvider,
} from '@/lib/constants';

type EventProperties = Properties;
type UserProperties = Record<string, any>;

// Extend PostHog type to include Sentry integration
declare module 'posthog-js' {
  interface PostHog {
    sentry?: typeof Sentry;
  }
}

export class Analytics {
  private static instance: Analytics;
  private initialized = false;
  private exceptionTrackingProvider: ExceptionTrackingProvider;

  private constructor() {
    // Determine exception tracking provider based on configuration
    this.exceptionTrackingProvider = this.determineExceptionTrackingProvider();
  }

  private determineExceptionTrackingProvider(): ExceptionTrackingProvider {
    const provider = EXCEPTION_TRACKING_PROVIDER.value as ExceptionTrackingProvider;
    
    // Validate provider availability
    if (provider === 'sentry' && !SENTRY_ENABLED) {
      console.warn('Sentry exception tracking requested but Sentry is not enabled');
      return POSTHOG_ENABLED && POSTHOG_EXCEPTION_TRACKING.value === 'true' ? 'posthog' : 'none';
    }
    
    if (provider === 'posthog' && (!POSTHOG_ENABLED || POSTHOG_EXCEPTION_TRACKING.value !== 'true')) {
      console.warn('PostHog exception tracking requested but PostHog is not enabled');
      return SENTRY_ENABLED && SENTRY_EXCEPTION_TRACKING.value === 'true' ? 'sentry' : 'none';
    }
    
    if (provider === 'both') {
      const sentryAvailable = SENTRY_ENABLED && SENTRY_EXCEPTION_TRACKING.value === 'true';
      const posthogAvailable = POSTHOG_ENABLED && POSTHOG_EXCEPTION_TRACKING.value === 'true';
      
      if (!sentryAvailable && !posthogAvailable) return 'none';
      if (!sentryAvailable) return 'posthog';
      if (!posthogAvailable) return 'sentry';
    }
    
    return provider;
  }

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  init() {
    if (this.initialized) return;
    
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      console.warn('Analytics.init() called during server-side rendering');
      return;
    }
    
    const posthogKey = POSTHOG_KEY?.value;
    const posthogHost = POSTHOG_HOST?.value;
    
    if (POSTHOG_ENABLED && posthogKey && posthogHost) {
      // Initialize PostHog with centralized configuration
      const baseConfig: Partial<PostHogConfig> = {
        api_host: posthogHost,
        debug: POSTHOG_DEBUG.value === 'true',
        persistence: 'localStorage' as const,
        capture_pageview: POSTHOG_AUTO_CAPTURE.value === 'true',
        capture_pageleave: true,
        enable_recording_console_log: POSTHOG_DEBUG.value === 'true',
        mask_all_element_attributes: false,
        mask_all_text: false,
        loaded: (posthog) => {
          // Apply sampling rate if less than 100%
          if (POSTHOG_SAMPLE_RATE < 1) {
            // Randomly decide whether to capture events based on sample rate
            if (Math.random() > POSTHOG_SAMPLE_RATE) {
              posthog.opt_out_capturing();
            }
          }
        }
      };

      // Add session recording if enabled
      const config = POSTHOG_SESSION_RECORDING_ENABLED.value === 'true'
        ? {
            ...baseConfig,
            session_recording: {
              maskAllInputs: true,
              maskTextSelector: "[data-mask]",
              sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
            },
          }
        : baseConfig;

      // Initialize PostHog
      posthog.init(posthogKey, config);

      // Set up PostHog exception tracking if enabled
      if (POSTHOG_EXCEPTION_TRACKING.value === 'true' && (this.exceptionTrackingProvider === 'posthog' || this.exceptionTrackingProvider === 'both')) {
        this.setupPostHogExceptionTracking();
      }

      // Link PostHog with Sentry if both are enabled
      if (SENTRY_ENABLED && this.exceptionTrackingProvider === 'both') {
        // Set up Sentry integration
        posthog.sentry = Sentry;
        
        // Configure Sentry to send events to PostHog
        Sentry.addIntegration({
          name: 'PostHog',
          setupOnce() {
            Sentry.addEventProcessor((event: SentryEvent) => {
              if (event.user) {
                posthog.capture('sentry_error', {
                  error: event.message,
                  error_id: event.event_id,
                  error_type: event.type,
                  error_context: event.contexts,
                  error_tags: event.tags,
                });
              }
              return event;
            });
          },
        });
      }
    }

    this.initialized = true;
  }

  private setupPostHogExceptionTracking() {
    if (typeof window === 'undefined') return;

    // Override global error handler
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      this.captureException(error || new Error(String(message)), {
        source,
        lineno,
        colno,
        type: 'window.onerror',
      });
      
      // Call original handler if it exists and is a function
      if (typeof originalOnError === 'function') {
        return originalOnError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(
        new Error(event.reason?.message || String(event.reason)),
        {
          type: 'unhandledrejection',
          promise: event.promise,
        }
      );
    });
  }

  // User Identification and Properties
  identify(userId: string, properties?: UserProperties) {
    if (!this.initialized || !POSTHOG_ENABLED || typeof window === 'undefined') return;
    posthog?.identify(userId, properties);
    if (SENTRY_ENABLED) {
      Sentry.setUser({ id: userId, ...properties });
    }
  }

  reset() {
    if (!this.initialized || !POSTHOG_ENABLED || typeof window === 'undefined') return;
    posthog?.reset();
    if (SENTRY_ENABLED) {
      Sentry.setUser(null);
    }
  }

  // Event Tracking
  track(eventName: string, properties?: EventProperties) {
    if (!this.initialized || !POSTHOG_ENABLED || typeof window === 'undefined') return;
    posthog?.capture(eventName, properties);
  }

  // Page Views
  trackPageView(url: string, properties?: EventProperties) {
    if (!this.initialized || !POSTHOG_ENABLED || typeof window === 'undefined') return;
    posthog?.capture('$pageview', {
      $current_url: url,
      ...properties,
    });
  }

  // Feature Flags
  isFeatureEnabled(flagKey: string, defaultValue = false): boolean {
    if (!this.initialized || !POSTHOG_ENABLED || typeof window === 'undefined') return defaultValue;
    return posthog?.isFeatureEnabled(flagKey) ?? defaultValue;
  }

  async reloadFeatureFlags(): Promise<void> {
    if (!this.initialized || !POSTHOG_ENABLED || typeof window === 'undefined') return;
    await posthog?.reloadFeatureFlags();
  }

  // Error Tracking - Updated to support multiple providers
  captureError(error: Error, context?: Record<string, any>) {
    console.warn('[Analytics] captureError is deprecated. Use captureException instead.');
    this.captureException(error, context);
  }

  // Exception Tracking - New unified method
  captureException(error: Error | string, context?: Record<string, any>) {
    if (!this.initialized || typeof window === 'undefined') return;
    
    const errorObject = typeof error === 'string' ? new Error(error) : error;
    const provider = this.exceptionTrackingProvider;
    
    // Send to PostHog if enabled
    if (POSTHOG_ENABLED && (provider === 'posthog' || provider === 'both')) {
      this.track('$exception', {
        $exception_message: errorObject.message,
        $exception_type: errorObject.name,
        $exception_stack_trace_raw: errorObject.stack,
        $exception_handled: true,
        ...context,
      });
    }

    // Send to Sentry if enabled
    if (SENTRY_ENABLED && (provider === 'sentry' || provider === 'both')) {
      Sentry.captureException(errorObject, {
        extra: context,
      });
    }
  }

  // Get current exception tracking provider
  getExceptionTrackingProvider(): ExceptionTrackingProvider {
    return this.exceptionTrackingProvider;
  }

  // User Properties
  setUserProperties(properties: UserProperties) {
    if (!this.initialized || !POSTHOG_ENABLED || typeof window === 'undefined') return;
    posthog?.people.set(properties);
  }

  // Super Properties (properties sent with every event)
  setSuperProperties(properties: Record<string, any>) {
    if (!this.initialized || !POSTHOG_ENABLED || typeof window === 'undefined') return;
    posthog?.register(properties);
  }
}

export const analytics = Analytics.getInstance(); 