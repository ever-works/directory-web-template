'use client';

import { Switch } from '@heroui/react';

interface SettingSwitchProps {
	label: string;
	description?: string;
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
}

export function SettingSwitch({
	label,
	description,
	value,
	onChange,
	disabled = false
}: SettingSwitchProps) {
	return (
		<div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
			<div className="flex-1 pr-4">
				<label className="text-sm font-medium text-gray-900 dark:text-gray-100">
					{label}
				</label>
				{description && (
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
						{description}
					</p>
				)}
			</div>
			<Switch
				isSelected={value}
				onValueChange={onChange}
				isDisabled={disabled}
				color="primary"
				size="md"
			/>
		</div>
	);
}
