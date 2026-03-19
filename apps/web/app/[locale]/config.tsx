'use client';

import type { Config } from '@/lib/content';
import { createContext, useContext, useMemo } from 'react';
import { getAuthConfig } from '@/lib/auth/config';
import { defaultPricingConfig, getDefaultPricingConfigWithCurrency } from '@/lib/types';
import { useCurrencyContext } from '@/components/context/currency-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';
import { usePaymentProvider } from '@/lib/utils/payment-provider';

const ConfigContext = createContext<Config>({});

// Initialize auth config once during module load
const initialAuthConfig = getAuthConfig();

export function ConfigProvider({ config, children }: { config: Config; children: React.ReactNode }) {
	// Get user's currency from currency context
	// CurrencyProvider must be a parent of ConfigProvider (which it is in providers.tsx)
	const { currency, isLoading: currencyLoading } = useCurrencyContext();

	// Get user's selected checkout provider from Settings
	const { getActiveProvider } = useSelectedCheckoutProvider();

	// Determine payment provider: User selection takes precedence over config
	const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);

	const enhancedConfig = useMemo(() => {
		//
		let pricing = config.pricing;

		if (!pricing && !currencyLoading) {
			// If no pricing in config, generate currency-aware default config
			pricing = getDefaultPricingConfigWithCurrency(currency, paymentProvider);
		} else if (!pricing) {
			// If currency is still loading, use default config
			pricing = defaultPricingConfig;
		} else if (!currencyLoading && currency) {
			// If config has pricing but we want to enrich it with currency-aware price IDs
			// We can optionally enhance the existing config with currency-specific IDs
			// For now, we keep the config as-is since it might come from content/config.yml
			// The currency-aware price IDs will be resolved at checkout time via getStripePriceConfig/getLemonSqueezyPriceConfig
		}

		const configWithPricing = { ...config, pricing };
		return { ...configWithPricing, authConfig: initialAuthConfig };
	}, [config, currency, currencyLoading, paymentProvider]);

	return <ConfigContext.Provider value={enhancedConfig}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
	const context = useContext<Config>(ConfigContext);
	if (!context) {
		throw new Error('useConfig must be used within a ConfigProvider');
	}
	return context;
}
