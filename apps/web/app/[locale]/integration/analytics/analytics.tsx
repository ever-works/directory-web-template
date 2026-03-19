'use client';

import { Analytics as VercelAnalytics, type BeforeSendEvent } from '@vercel/analytics/react';
import { useEffect, useState, useRef } from 'react';

interface AnalyticsConfig {
	/**
	 * Enable/disable Analytics manually (optional)
	 * If not set, Analytics will auto-detect based on Vercel environment
	 * and feature availability
	 */
	enabled?: boolean;
	
	/**
	 * Sample rate for Analytics (0.0 to 1.0)
	 * Default: 1.0 (100% of page views)
	 * Useful for reducing data points on free tier
	 */
	sampleRate?: number;
}


export function Analytics({ 
	enabled, 
	sampleRate 
}: AnalyticsConfig = {}) {
	const [shouldRender, setShouldRender] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [finalSampleRate, setFinalSampleRate] = useState<number>(1.0);
	const isInitialized = useRef(false);

	useEffect(() => {
		// Client-side only check
		if (typeof window === 'undefined') {
			return;
		}

		// Prevent multiple initializations
		if (isInitialized.current) {
			return;
		}

		try {
			// Priority 1: Check if manually disabled via prop
			if (enabled === false) {
				setShouldRender(false);
				isInitialized.current = true;
				return;
			}

			// Priority 2: Check environment variable
			const envEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
			if (envEnabled === 'false') {
				setShouldRender(false);
				isInitialized.current = true;
				return;
			}

			// Priority 3: Get sample rate from environment variable or prop (default: 1.0)
			const envSampleRate = process.env.NEXT_PUBLIC_ANALYTICS_SAMPLE_RATE;
			const calculatedSampleRate = sampleRate ?? 
				(envSampleRate ? parseFloat(envSampleRate) : 1.0);
			
			// Validate sample rate (must be between 0 and 1)
			const validSampleRate = Math.max(0, Math.min(1, calculatedSampleRate));
			setFinalSampleRate(validSampleRate);

			// Priority 4: Check for Vercel Analytics ID (most reliable indicator)
			// This is set by Vercel ONLY when Analytics is enabled AND paid
			const vercelAnalyticsId = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID;

			// Priority 5: Check if we're on Vercel
			const isVercel = process.env.NEXT_PUBLIC_VERCEL === '1' || 
			                 process.env.VERCEL === '1' ||
			                 (typeof window !== 'undefined' && 
			                  (window.location.hostname.includes('vercel.app') || 
			                   window.location.hostname.includes('vercel.com')));
            
			if (enabled === true || envEnabled === 'true') {
				// Explicitly enabled via prop or env var - render it
				setShouldRender(true);
			} else if (vercelAnalyticsId) {
				// Analytics ID present = Analytics is enabled and paid
				setShouldRender(true);
			} else if (isVercel && enabled === undefined && envEnabled === undefined) {
				// On Vercel but no explicit config - be conservative
				// Only render if we're sure it's available (we can't be sure without the ID)
				// So we default to false to avoid errors
				setShouldRender(false);
			} else {
				// Not on Vercel or explicitly disabled
				setShouldRender(false);
			}

			isInitialized.current = true;
		} catch (err) {
			// Catch any errors during initialization
			console.warn('[Analytics] Error during initialization:', err);
			setError(err instanceof Error ? err : new Error('Unknown error'));
			setShouldRender(false);
			isInitialized.current = true;
		}
	}, [enabled, sampleRate]);

	// Don't render if there was an error, not initialized, or explicitly disabled
	if (error || !isInitialized.current || !shouldRender) {
		return null;
	}

	// Apply sample rate if specified and less than 1.0
	// Note: Analytics has built-in sample rate support via props (but named differently)
	// The @vercel/analytics package doesn't have sampleRate prop like speed-insights
	// Instead, we can use beforeSend to implement sampling
	const props = finalSampleRate < 1.0 
		? { 
			beforeSend: (event: BeforeSendEvent): BeforeSendEvent | null => {
				// Only send events based on sample rate
				if (Math.random() > finalSampleRate) {
					return null;
				}
				return event;
			}
		} 
		: {};

	// Render Analytics component
	// VercelAnalytics handles errors gracefully internally and returns null
	// if the feature is not available or not paid/enabled
	return <VercelAnalytics {...props} />;
}

