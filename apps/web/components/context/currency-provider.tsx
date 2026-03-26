'use client';

import React, { createContext, useContext } from 'react';
import { useCurrency, type UpdateCurrencyOptions } from '@/hooks/use-currency';

interface CurrencyContextType {
	currency: string;
	country: string | null;
	isLoading: boolean;
	updateCurrency: (currency: string, options?: UpdateCurrencyOptions) => void;
}

const DEFAULT_CURRENCY_CONTEXT: CurrencyContextType = {
	currency: 'USD',
	country: null,
	isLoading: false,
	updateCurrency: () => undefined
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

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

export function useOptionalCurrencyContext(): CurrencyContextType {
	return useContext(CurrencyContext) ?? DEFAULT_CURRENCY_CONTEXT;
}

export function useCurrencyContext(): CurrencyContextType {
	const context = useContext(CurrencyContext);
	if (context === undefined) {
		throw new Error('useCurrencyContext must be used within a CurrencyProvider');
	}
	return context;
}
