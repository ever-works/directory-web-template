'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js';

// ============================================================================
// CONSTANTS
// ============================================================================

// Light mode configuration - UPDATED
export const STRIPE_ELEMENT_OPTIONS_LIGHT = {
	style: {
		base: {
			fontSize: '16px',
			color: '#000000', // Pure black for maximum contrast in light mode
			'::placeholder': {
				color: '#6b7280' // text-gray-500 - Darker placeholder for better visibility
			}
		},
		invalid: {
			color: '#dc2626' // text-red-600 - Clear red for errors in light mode
		}
	}
} as const;

// Dark mode configuration
export const STRIPE_ELEMENT_OPTIONS_DARK = {
	style: {
		base: {
			fontSize: '16px',
			color: '#f3f4f6', // text-gray-100 - Light color for text in dark mode
			'::placeholder': {
				color: '#9ca3af' // text-gray-400 - Well visible placeholder in dark mode
			}
		},
		invalid: {
			color: '#f87171' // text-red-400 - Light red for errors in dark mode
		}
	}
} as const;

// Alternative configuration using CSS variables (recommended for better theme integration)
export const STRIPE_ELEMENT_OPTIONS_CSS_VARS = {
	style: {
		base: {
			fontSize: '16px',
			color: 'rgb(var(--foreground))', // Uses theme text color
			'::placeholder': {
				color: 'rgb(var(--muted-foreground))' // Uses theme muted text color
			}
		},
		invalid: {
			color: 'rgb(var(--destructive))' // Uses theme destructive color
		}
	}
} as const;

// Default configuration (light mode)
export const STRIPE_ELEMENT_OPTIONS = STRIPE_ELEMENT_OPTIONS_LIGHT;

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to detect dark mode via CSS
 */
function useDarkMode() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		// Initial detection
		const checkDarkMode = () => {
			if (typeof window !== 'undefined') {
				const isDarkMode =
					document.documentElement.classList.contains('dark') ||
					window.matchMedia('(prefers-color-scheme: dark)').matches;
				setIsDark(isDarkMode);
			}
		};

		checkDarkMode();

		if (typeof window !== 'undefined') {
			// Observe class changes on html element
			const observer = new MutationObserver(checkDarkMode);
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class']
			});

			// Observe system preference changes
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			const handleChange = () => checkDarkMode();
			mediaQuery.addEventListener('change', handleChange);

			return () => {
				observer.disconnect();
				mediaQuery.removeEventListener('change', handleChange);
			};
		}
	}, []);

	return isDark;
}

export function useStripeElementOptions() {
	const isDark = useDarkMode();
	return isDark ? STRIPE_ELEMENT_OPTIONS_DARK : STRIPE_ELEMENT_OPTIONS_LIGHT;
}

// ============================================================================
// REUSABLE STRIPE COMPONENTS
// ============================================================================

/**
 * Reusable Stripe Card Input Component
 * Provides a complete card input form with number, expiry, and CVC
 */
export interface StripeCardInputProps {
	className?: string;
	disabled?: boolean;
	theme?: 'light' | 'dark' | 'auto'; // Allows forcing a specific theme
}

export function StripeCardInput({ className, disabled, theme = 'auto' }: StripeCardInputProps) {
	const t = useTranslations('billing');
	const autoDetectedTheme = useStripeElementOptions();

	// Determine options based on theme
	const getStripeOptions = () => {
		switch (theme) {
			case 'light':
				return STRIPE_ELEMENT_OPTIONS_LIGHT;
			case 'dark':
				return STRIPE_ELEMENT_OPTIONS_DARK;
			case 'auto':
			default:
				return autoDetectedTheme;
		}
	};

	// Create options with disabled state
	const elementOptions = {
		...getStripeOptions(),
		disabled
	};

	// Debug log to verify options
	console.log('Stripe Element Options:', elementOptions);

	return (
		<div className={`space-y-4 ${className}`}>
			<div>
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					{t('CARD_NUMBER')}
				</label>
				<div className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
					<CardNumberElement
						options={{
							style: {
								base: {
									fontSize: '16px',
									color: '#000000',
									'::placeholder': { color: '#6b7280' }
								}
							}
						}}
					/>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						{t('EXPIRY_MONTH')} / {t('EXPIRY_YEAR')}
					</label>
					<div className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
						<CardExpiryElement
							options={{
								style: {
									base: {
										fontSize: '16px',
										color: '#000000',
										'::placeholder': { color: '#6b7280' }
									}
								}
							}}
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						{t('CVC')}
					</label>
					<div className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
						<CardCvcElement
							options={{
								style: {
									base: {
										fontSize: '16px',
										color: '#000000',
										'::placeholder': { color: '#6b7280' }
									}
								}
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Reusable Success Display Component
 * Shows a success message with icon
 */
export interface SuccessDisplayProps {
	title: string;
	description: string;
	className?: string;
	iconSize?: 'sm' | 'md' | 'lg';
}

export function SuccessDisplay({ title, description, className, iconSize = 'lg' }: SuccessDisplayProps) {
	const iconSizeClasses = {
		sm: 'w-8 h-8',
		md: 'w-12 h-12',
		lg: 'w-16 h-16'
	};

	return (
		<div className={`text-center py-8 ${className}`}>
			<CheckCircle className={`${iconSizeClasses[iconSize]} text-green-500 mx-auto mb-4`} />
			<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
			<p className="text-gray-600 dark:text-gray-400">{description}</p>
		</div>
	);
}

/**
 * Reusable Error Display Component
 * Shows an error message with icon
 */
export interface ErrorDisplayProps {
	error: string;
	className?: string;
	variant?: 'default' | 'compact';
}

export function ErrorDisplay({ error, className, variant = 'default' }: ErrorDisplayProps) {
	const baseClasses =
		'flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg';
	const variantClasses = {
		default: baseClasses,
		compact: `${baseClasses} p-2`
	};

	return (
		<div className={`${variantClasses[variant]} ${className}`}>
			<AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
			<p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
		</div>
	);
}

/**
 * Reusable Card Holder Name Input
 * Provides a styled input for cardholder name
 */
export interface CardHolderInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	className?: string;
}

export function CardHolderInput({ value, onChange, placeholder, disabled, required, className }: CardHolderInputProps) {
	const t = useTranslations('billing');

	return (
		<div className={className}>
			<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				{t('CARD_HOLDER_NAME')}
				{required && <span className="text-red-500 ml-1">*</span>}
			</label>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder || t('CARD_HOLDER_NAME_PLACEHOLDER')}
				className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
				required={required}
				disabled={disabled}
			/>
		</div>
	);
}

/**
 * Reusable Set as Default Checkbox
 * Provides a styled checkbox for setting payment method as default
 */
export interface SetAsDefaultCheckboxProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	className?: string;
}

export function SetAsDefaultCheckbox({ checked, onChange, disabled, className }: SetAsDefaultCheckboxProps) {
	const t = useTranslations('billing');

	return (
		<div className={`flex items-center ${className}`}>
			<input
				type="checkbox"
				id="setAsDefault"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="mr-2 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500"
				disabled={disabled}
			/>
			<label htmlFor="setAsDefault" className="text-sm text-gray-700 dark:text-gray-300">
				{t('SET_AS_DEFAULT_PAYMENT')}
			</label>
		</div>
	);
}
