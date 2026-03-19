'use client';

import { Label } from '@/components/ui/label';

interface SettingSliderProps {
	label: string;
	description?: string;
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	step?: number;
	unit?: string;
	disabled?: boolean;
}

export function SettingSlider({
	label,
	description,
	value,
	onChange,
	min,
	max,
	step = 1,
	unit = '',
	disabled = false
}: SettingSliderProps) {
	const percentage = ((value - min) / (max - min)) * 100;

	return (
		<div className="py-3">
			<div className="flex items-center justify-between mb-2">
				<Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
					{label}
				</Label>
				<span className="text-sm font-medium text-theme-primary">
					{value}
					{unit}
				</span>
			</div>
			{description && (
				<p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>
			)}
			<div className="max-w-md">
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					onChange={(e) => onChange(Number(e.target.value))}
					disabled={disabled}
					className="w-full h-2 bg-gray-200 dark:bg-white/8 rounded-lg appearance-none cursor-pointer accent-theme-primary disabled:opacity-50 disabled:cursor-not-allowed"
					style={{
						background: disabled
							? undefined
							: `linear-gradient(to right, var(--color-primary, #3b82f6) 0%, var(--color-primary, #3b82f6) ${percentage}%, rgb(229 231 235) ${percentage}%, rgb(229 231 235) 100%)`
					}}
				/>
				<div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
					<span>
						{min}
						{unit}
					</span>
					<span>
						{max}
						{unit}
					</span>
				</div>
			</div>
		</div>
	);
}
