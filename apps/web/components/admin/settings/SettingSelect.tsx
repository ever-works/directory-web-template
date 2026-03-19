'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';

interface SelectOption {
	value: string;
	label: string;
}

interface SettingSelectProps {
	label: string;
	description?: string;
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
	disabled?: boolean;
	usePortal?: boolean;
}

export function SettingSelect({
	label,
	description,
	value,
	onChange,
	options,
	disabled = false,
	usePortal = false
}: SettingSelectProps) {
	const handleSelectionChange = (keys: string[]) => {
		if (keys.length > 0) {
			onChange(keys[0]);
		}
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
			<Select
				selectedKeys={value ? [value] : []}
				onSelectionChange={handleSelectionChange}
				disabled={disabled}
				className="max-w-md"
				usePortal={usePortal}
			>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</Select>
		</div>
	);
}
