'use client';

import { Label } from '@/components/ui/label';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/utils/currency-format';

interface SettingCurrencyInputProps {
	label: string;
	description?: string;
	value: number;
	onChange: (value: number) => void;
	currency?: string;
	placeholder?: string;
	disabled?: boolean;
}

/**
 * Formats a number with thousand separators based on locale
 */
function formatWithSeparators(value: string | number): string {
	// Remove any non-numeric characters except decimal point
	const numStr = String(value).replace(/[^\d.]/g, '');
	const parts = numStr.split('.');

	// Format integer part with thousand separators
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	// Limit decimal places to 2
	if (parts[1]) {
		parts[1] = parts[1].slice(0, 2);
	}

	return parts.join('.');
}

/**
 * Parses a formatted string back to a number
 */
function parseFormattedValue(value: string): number {
	const cleaned = value.replace(/,/g, '');
	const parsed = parseFloat(cleaned);
	return isNaN(parsed) ? 0 : parsed;
}

export function SettingCurrencyInput({
	label,
	description,
	value,
	onChange,
	currency = 'USD',
	placeholder = '0.00',
	disabled = false,
}: SettingCurrencyInputProps) {
	// Store the display value (formatted string)
	const [displayValue, setDisplayValue] = useState(() => formatWithSeparators(value.toFixed(2)));

	// Update display value when prop changes (e.g., from API)
	useEffect(() => {
		setDisplayValue(formatWithSeparators(value.toFixed(2)));
	}, [value]);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const rawValue = e.target.value;

		// Allow only numbers, commas, and decimal point
		const sanitized = rawValue.replace(/[^\d.,]/g, '');

		// If empty, show empty and set value to 0
		if (!sanitized) {
			setDisplayValue('');
			return;
		}

		// Format with separators
		const formatted = formatWithSeparators(sanitized);
		setDisplayValue(formatted);
	}, []);

	const handleBlur = useCallback(() => {
		// On blur, parse the value and call onChange
		const numericValue = parseFormattedValue(displayValue);
		onChange(numericValue);

		// Also ensure display shows proper formatting with 2 decimal places
		setDisplayValue(formatWithSeparators(numericValue.toFixed(2)));
	}, [displayValue, onChange]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		// Submit on Enter
		if (e.key === 'Enter') {
			e.currentTarget.blur();
		}
	}, []);

	const currencySymbol = getCurrencySymbol(currency);
	// Calculate padding based on currency symbol length (longer codes need more space)
	const symbolLength = currencySymbol.length;
	const paddingClass = symbolLength >= 3 ? 'pl-14' : symbolLength >= 2 ? 'pl-10' : 'pl-8';

	return (
		<div className="py-3">
			<Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
				{label}
			</Label>
			{description && (
				<p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2">
					{description}
				</p>
			)}
			<div className="relative max-w-md">
				<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
					<span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
						{currencySymbol}
					</span>
				</div>
				<input
					type="text"
					inputMode="decimal"
					value={displayValue}
					onChange={handleChange}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					className={cn(
						"w-full flex items-center px-3 py-2 rounded-lg transition-colors",
						paddingClass,
						"border border-gray-300 dark:border-gray-600 bg-transparent",
						"text-gray-900 dark:text-white text-sm",
						"focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
						"disabled:opacity-50 disabled:cursor-not-allowed",
						"h-10"
					)}
				/>
			</div>
		</div>
	);
}
