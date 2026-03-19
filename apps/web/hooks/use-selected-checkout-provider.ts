'use client';

import { useLayoutTheme } from '@/components/context/LayoutThemeContext';
import type { CheckoutProvider } from '@/components/context/LayoutThemeContext';

/**
 * Hook to access the user-selected checkout provider
 *
 * This hook provides access to the checkout provider selection
 * managed in the Settings modal. Use this in components that
 * initiate payment/checkout flows.
 *
 * @example
 * ```tsx
 * const { getActiveProvider } = useSelectedCheckoutProvider();
 * const provider = getActiveProvider();
 *
 * switch (provider) {
 *   case 'stripe': await initiateStripeCheckout(); break;
 *   case 'lemonsqueezy': await initiateLemonSqueezyCheckout(); break;
 *   case 'polar': await initiatePolarCheckout(); break;
 * }
 * ```
 */
export function useSelectedCheckoutProvider() {
	const { checkoutProvider, setCheckoutProvider, configuredProviders } = useLayoutTheme();

	/**
	 * Get the currently active provider
	 *
	 * Returns the user's selected provider if it's configured,
	 * otherwise falls back to the first configured provider.
	 *
	 * @returns The active checkout provider or null if none configured
	 */
	const getActiveProvider = (): CheckoutProvider | null => {
		if (configuredProviders.includes(checkoutProvider)) {
			return checkoutProvider;
		}
		return configuredProviders[0] || null;
	};

	/**
	 * Check if a specific provider is configured
	 *
	 * @param provider - The provider to check
	 * @returns True if the provider is configured
	 */
	const isProviderConfigured = (provider: CheckoutProvider): boolean => {
		return configuredProviders.includes(provider);
	};

	/**
	 * Check if the current selection is configured
	 *
	 * @returns True if the currently selected provider is configured
	 */
	const isCurrentProviderConfigured = (): boolean => {
		return configuredProviders.includes(checkoutProvider);
	};

	/**
	 * Get the fallback provider (first configured provider)
	 *
	 * @returns The fallback provider or null if none configured
	 */
	const getFallbackProvider = (): CheckoutProvider | null => {
		return configuredProviders[0] || null;
	};

	return {
		/** The user's selected checkout provider */
		checkoutProvider,
		/** Update the selected checkout provider */
		setCheckoutProvider,
		/** Array of all configured providers */
		configuredProviders,
		/** Get the active provider (selected or fallback) */
		getActiveProvider,
		/** Check if a provider is configured */
		isProviderConfigured,
		/** Check if current selection is configured */
		isCurrentProviderConfigured,
		/** Get the fallback provider */
		getFallbackProvider,
	};
}
