'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

interface ThemeTogglerProps {
	compact?: boolean;
	/** @deprecated no longer used */
	openUp?: boolean;
	/** @deprecated no longer used — all variants are now a single toggle button */
	iconOnly?: boolean;
}

export function ThemeToggler({ compact = false }: ThemeTogglerProps) {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [hovered, setHovered] = useState(false);
	const [pos, setPos] = useState({ top: 0, left: 0 });
	const t = useTranslations('common');

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

	const showTooltip = (btn: HTMLButtonElement) => {
		const r = btn.getBoundingClientRect();
		setPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
		setHovered(true);
	};

	const hideTooltip = () => setHovered(false);

	if (compact) {
		return (
			<button
				onClick={toggle}
				className="relative inline-flex items-center h-10 w-20 rounded-full transition-colors duration-300 bg-gray-300 data-checked:bg-theme-primary"
				data-checked={theme === 'dark' ? '' : undefined}
				aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
			>
				<span
					className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
						theme === 'dark' ? 'translate-x-11' : 'translate-x-1'
					}`}
				>
					<span className="flex items-center justify-center h-full w-full">
						{theme === 'dark' ? (
							<Moon className="h-5 w-5 text-theme-primary" />
						) : (
							<Sun className="h-5 w-5 text-theme-primary" />
						)}
					</span>
				</span>
			</button>
		);
	}

	const tooltipText = theme === 'dark' ? t('SWITCH_TO_LIGHT') : t('SWITCH_TO_DARK');

	return (
		<>
			<button
				type="button"
				onClick={() => {
					hideTooltip();
					toggle();
				}}
				onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
				onMouseLeave={hideTooltip}
				onFocus={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
				onBlur={hideTooltip}
				className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-white/6 text-gray-700 dark:text-gray-300"
				aria-label={tooltipText}
			>
				{theme === 'dark' ? (
					<Moon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
				) : (
					<Sun className="h-4 w-4 text-yellow-500" />
				)}
			</button>
			{hovered &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						className="fixed z-[9999] px-2 py-1 rounded-md text-xs font-medium pointer-events-none bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
						style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
					>
						{tooltipText}
					</div>,
					document.body
				)}
		</>
	);
}
