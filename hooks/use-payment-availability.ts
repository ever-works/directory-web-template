import { useMemo, useState, useEffect } from 'react';
import { useLayoutTheme } from '@/components/context';
import { isDemoMode } from '@/lib/utils';

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
 * Note: Returns default state (all plans visible) during SSR to prevent hydration mismatch.
 * The actual computed values are applied after client-side hydration.
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

	// Use state to track hydration and avoid SSR mismatch
	const [isHydrated, setIsHydrated] = useState(false);

	// Set hydrated after mount
	useEffect(() => {
		setIsHydrated(true);
	}, []);

	return useMemo(() => {
		// Compute actual state first
		const isDemo = isDemoMode();
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

		if (!isHydrated) {
			return DEFAULT_STATE;
		}

		return computedState;
	}, [configuredProviders, isHydrated]);
}
