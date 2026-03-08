'use client';

import React, { createContext, useContext } from 'react';
import { useCurrency, type UpdateCurrencyOptions } from '@/hooks/use-currency';

interface CurrencyContextType {
	currency: string;
	country: string | null;
	isLoading: boolean;
	updateCurrency: (currency: string, options?: UpdateCurrencyOptions) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

/**
 * Currency Provider
 * Provides currency context to the entire application
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
	const { currency, country, isLoading, updateCurrency } = useCurrency();
	return (
		<CurrencyContext.Provider
			value={{
				currency,
				country,
				isLoading,
				updateCurrency
			}}
		>
			{children}
		</CurrencyContext.Provider>
	);
}

/**
 * Hook to use currency context
 */
export function useCurrencyContext(): CurrencyContextType {
	const context = useContext(CurrencyContext);
	if (context === undefined) {
		throw new Error('useCurrencyContext must be used within a CurrencyProvider');
	}
	return context;
}
