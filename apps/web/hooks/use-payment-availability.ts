import { useMemo, useState, useEffect } from 'react';
import { useLayoutTheme } from '@/components/context';
import { usePublicPaymentConfig } from './use-public-payment-config';

/**
 * Payment availability information based on environment and configuration
 */
export interface PaymentAvailability {
	/** Whether any payment provider is configured */
	isPaymentConfigured: boolean;
	/** Whether we're in demo mode */
	isDemoMode: boolean;
	/** Whether to show paid plans (STANDARD, PREMIUM) */
	shouldShowPaidPlans: boolean;
	/** Whether to show payment provider warnings/notifications */
	shouldShowPaymentWarning: boolean;
	/** List of configured providers */
	configuredProviders: string[];
	/** Whether the hook has been initialized (hydrated) */
	isHydrated: boolean;
}

/**
 * Default state for SSR - shows all plans to prevent layout shift.
 * Note: isPaymentConfigured=false matches empty configuredProviders (invariant).
 * shouldShowPaidPlans=true via isDemoMode=true ensures all plans render during SSR.
 */
const DEFAULT_STATE: PaymentAvailability = {
	isPaymentConfigured: false,
	isDemoMode: true,
	shouldShowPaidPlans: true,
	shouldShowPaymentWarning: false,
	configuredProviders: [],
	isHydrated: false
};

/**
 * Hook to determine payment availability and what should be displayed
 * based on the environment (LIVE vs DEMO) and payment configuration.
 *
 * Behavior:
 * - LIVE mode (DEMO=false) + no payment configured → Show FREE only, no warning
 * - DEMO mode (DEMO=true) + no payment configured → Show all plans, warning visible
 * - Payment configured → Normal behavior in both modes
 *
 * Note: Returns default state (all plans visible) during SSR to prevent hydration mismatch,
 * and keeps it until the runtime public payment config (spec 044, `/api/payment/public-config`)
 * has been fetched once — so a platform-deployed k8s build (no inlined NEXT_PUBLIC_*) does not
 * flash "FREE only" before the server-provided provider list arrives. The actual computed values
 * are applied after client-side hydration + first fetch (success or error).
 *
 * @returns PaymentAvailability object with display logic flags
 *
 * @example
 * ```tsx
 * const { shouldShowPaidPlans, shouldShowPaymentWarning } = usePaymentAvailability();
 *
 * return (
 *   <>
 *     <FreePlanCard />
 *     {shouldShowPaidPlans && <PaidPlanCards />}
 *     {shouldShowPaymentWarning && <PaymentWarning />}
 *   </>
 * );
 * ```
 */
export function usePaymentAvailability(): PaymentAvailability {
	const { configuredProviders } = useLayoutTheme();
	// Runtime public payment config (spec 044): `demo` is the server's NEXT_PUBLIC_DEMO with the
	// build-time value as fallback; `isResolved` flips once the first fetch settled (success or error).
	const { config: publicPaymentConfig, isResolved: isPaymentConfigResolved } = usePublicPaymentConfig();
	const isDemo = publicPaymentConfig.demo;

	// Use state to track hydration and avoid SSR mismatch
	const [isHydrated, setIsHydrated] = useState(false);

	// Set hydrated after mount
	useEffect(() => {
		setIsHydrated(true);
	}, []);

	return useMemo(() => {
		// Compute actual state first
		const isPaymentConfigured = configuredProviders.length > 0;

		const computedState: PaymentAvailability = {
			isPaymentConfigured,
			isDemoMode: isDemo,
			// Show paid plans if: payment is configured OR we're in demo mode
			shouldShowPaidPlans: isPaymentConfigured || isDemo,
			// Show warning if: no payment configured AND we're in demo mode
			shouldShowPaymentWarning: !isPaymentConfigured && isDemo,
			configuredProviders,
			isHydrated: true
		};

		if (!isHydrated || !isPaymentConfigResolved) {
			return DEFAULT_STATE;
		}

		return computedState;
	}, [configuredProviders, isHydrated, isDemo, isPaymentConfigResolved]);
}
