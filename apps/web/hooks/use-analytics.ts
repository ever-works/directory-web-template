import { useCallback } from 'react';
import { analytics } from '@/lib/analytics';

type EventProperties = Record<string, any>;

export function useAnalytics() {
  const trackEvent = useCallback((eventName: string, properties?: EventProperties) => {
    analytics.track(eventName, properties);
  }, []);

  const trackConversion = useCallback((conversionName: string, properties?: EventProperties) => {
    analytics.track(`conversion_${conversionName}`, {
      ...properties,
      conversion_type: conversionName,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackUserAction = useCallback((action: string, properties?: EventProperties) => {
    analytics.track(`user_action_${action}`, {
      ...properties,
      action_type: action,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const identifyUser = useCallback((userId: string, properties?: EventProperties) => {
    analytics.identify(userId, properties);
  }, []);

  const setUserProperties = useCallback((properties: EventProperties) => {
    analytics.setUserProperties(properties);
  }, []);

  return {
    trackEvent,
    trackConversion,
    trackUserAction,
    identifyUser,
    setUserProperties,
  };
}

// Example usage:
/*
const { trackEvent, trackConversion } = useAnalytics();

// Track a general event
trackEvent('button_clicked', { buttonId: 'submit' });

// Track a conversion
trackConversion('signup_completed', { plan: 'pro' });

// Track a user action
trackUserAction('profile_updated', { fields: ['name', 'email'] });
*/ 