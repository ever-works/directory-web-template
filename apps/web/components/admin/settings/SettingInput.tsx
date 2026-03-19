'use client';

import { Input } from '@/components/ui/input';
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
			<Input
				type={type}
				value={value}
				onChange={handleChange}
				placeholder={placeholder}
				disabled={disabled}
				className="max-w-md"
			/>
		</div>
	);
}
