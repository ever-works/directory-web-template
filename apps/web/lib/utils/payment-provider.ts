import { useMemo } from 'react';
import { PaymentProvider } from '@/lib/constants';
import type { CheckoutProvider } from '@/components/context/LayoutThemeContext';
import type { PricingPlanConfig } from '@/lib/content';

/**
 * Maps CheckoutProvider string to PaymentProvider enum
 */
const CHECKOUT_PROVIDER_TO_PAYMENT_PROVIDER: Record<CheckoutProvider, PaymentProvider> = {
	stripe: PaymentProvider.STRIPE,
	lemonsqueezy: PaymentProvider.LEMONSQUEEZY,
	polar: PaymentProvider.POLAR,
	solidgate: PaymentProvider.SOLIDGATE
};

/**
 * Determines the payment provider with the following priority:
 * 1. User's selected provider from Settings
 * 2. Config default provider
 * 3. Fallback to Stripe
 *
 * @param userSelectedProvider - The provider selected by the user (from useSelectedCheckoutProvider)
 * @param configProvider - The provider from config.pricing?.provider
 * @returns The determined PaymentProvider
 *
 * @example
 * ```ts
 * const { getActiveProvider } = useSelectedCheckoutProvider();
 * const config = useConfig();
 * const provider = determinePaymentProvider(getActiveProvider(), config.pricing?.provider);
 * ```
 */
export function determinePaymentProvider(
	userSelectedProvider: CheckoutProvider | null,
	configProvider?: PaymentProvider
): PaymentProvider {
	// Priority 1: User's selected provider
	if (userSelectedProvider && userSelectedProvider in CHECKOUT_PROVIDER_TO_PAYMENT_PROVIDER) {
		return CHECKOUT_PROVIDER_TO_PAYMENT_PROVIDER[userSelectedProvider];
	}

	// Priority 2: Config default provider
	if (configProvider) {
		return configProvider;
	}

	// Priority 3: Fallback to Stripe
	return PaymentProvider.STRIPE;
}

/**
 * Hook helper to determine payment provider using React hooks
 * This is a convenience wrapper for useMemo with determinePaymentProvider
 *
 * @param getActiveProvider - Function from useSelectedCheckoutProvider hook
 * @param configPricing - The pricing config from useConfig hook
 * @returns The determined PaymentProvider
 *
 * @example
 * ```tsx
 * const { getActiveProvider } = useSelectedCheckoutProvider();
 * const config = useConfig();
 * const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
 * ```
 */
export function usePaymentProvider(
	getActiveProvider: () => CheckoutProvider | null,
	configPricing?: PricingPlanConfig
): PaymentProvider {
	const userSelectedProvider = getActiveProvider();
	return useMemo(
		() => determinePaymentProvider(userSelectedProvider, configPricing?.provider),
		[userSelectedProvider, configPricing?.provider]
	);
}
