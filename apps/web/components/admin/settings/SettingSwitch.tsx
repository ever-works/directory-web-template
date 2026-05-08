'use client';

interface SettingSwitchProps {
	label: string;
	description?: string;
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
}

export function SettingSwitch({ label, description, value, onChange, disabled = false }: SettingSwitchProps) {
	return (
		<div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
			<div className="flex-1 pr-8">
				<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
				{description && (
					<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
				)}
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={value}
				onClick={() => !disabled && onChange(!value)}
				disabled={disabled}
				className={[
					'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
					'transition-colors duration-200 ease-in-out',
					'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
					'disabled:cursor-not-allowed disabled:opacity-50',
					value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
				].join(' ')}
			>
				<span
					className={[
						'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0',
						'transition-transform duration-200 ease-in-out',
						value ? 'translate-x-4' : 'translate-x-0'
					].join(' ')}
				/>
			</button>
		</div>
	);
}
