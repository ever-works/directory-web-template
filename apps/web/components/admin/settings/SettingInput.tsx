'use client';

import { Label } from '@/components/ui/label';
import { ChangeEvent } from 'react';

interface SettingInputProps {
	label: string;
	description?: string;
	value: string | number;
	onChange: (value: string | number) => void;
	type?: 'text' | 'number';
	placeholder?: string;
	disabled?: boolean;
}

export function SettingInput({
	label,
	description,
	value,
	onChange,
	type = 'text',
	placeholder,
	disabled = false
}: SettingInputProps) {
	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const newValue = type === 'number'
			? parseFloat(e.target.value) || 0
			: e.target.value;
		onChange(newValue);
	};

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
			<input
				type={type}
				value={value}
				onChange={handleChange}
				placeholder={placeholder}
				disabled={disabled}
				className="flex h-9 w-full max-w-md rounded-md border border-gray-300 dark:border-white/10 bg-transparent px-3 py-1 text-sm text-gray-900 dark:text-gray-100 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
			/>
		</div>
	);
}
