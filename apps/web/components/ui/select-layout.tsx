'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Layout, LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLayoutTheme, LayoutHome } from '@/components/context/LayoutThemeContext';
import { useTheme } from 'next-themes';
import Image from 'next/image';

interface SelectLayoutProps {
	className?: string;
	disabled?: boolean;
}

const SelectLayout: React.FC<SelectLayoutProps> = ({ className, disabled = false }) => {
	const { layoutHome, setLayoutHome } = useLayoutTheme();
	const { resolvedTheme } = useTheme();
	const t = useTranslations('common');
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Determine if we're in dark mode
	// Use false as default during SSR to avoid hydration mismatch
	const isDark = mounted && resolvedTheme === 'dark';

	const layouts = useMemo(
		() => [
			{
				key: LayoutHome.HOME_ONE,
				name: 'Home 1',
				label: t('CLASSIC_DESIGN'),
				description: t('CLASSIC_LAYOUT_DESC'),
				icon: <Layout className="w-4 h-4" />,
				imageSrc: isDark ? '/home-1.png' : '/home-light-1.png'
			},
			{
				key: LayoutHome.HOME_TWO,
				name: 'Home 2',
				label: t('MODERN_GRID'),
				description: t('GRID_LAYOUT_DESC'),
				icon: <LayoutGrid className="w-4 h-4" />,
				imageSrc: isDark ? '/home-2.png' : '/home-light-2.png'
			}
		],
		[isDark, t]
	);

	const handleLayoutChange = (layout: LayoutHome) => {
		if (disabled || layout === layoutHome) return;
		setLayoutHome(layout);

		// Toast notification
		const selectedLayout = layouts.find((l) => l.key === layout);
		toast.success(selectedLayout?.label || layout, {
			duration: 2000,
			description: selectedLayout?.description
		});
	};

	return (
		<div
			className={cn(
			'group p-5 rounded-xl',
			'bg-white/80 dark:bg-white/[0.04]',
			'border border-gray-200/50 dark:border-white/[0.07]',
			'shadow-sm',
			'transition-all duration-200',
			className
			)}
		>
			<div className="flex flex-col gap-4">
				{/* Icon + Title/Description */}
				<div className="flex items-start gap-3">
					{/* Icon container with blue gradient and glassmorphism */}
					<div
						className={cn(
							'bg-gray-100 dark:bg-white/5 p-2 rounded-lg flex-shrink-0',
						)}
					>
						<Layout className="h-5 w-5 text-gray-400 dark:text-gray-500" />
					</div>

					{/* Text content with improved typography */}
					<div className="flex-1 min-w-0">
						<h3 className="text-base font-semibold tracking-tight leading-tight text-gray-900 dark:text-gray-100">
							{t('LAYOUT')}
						</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
							{t('CHOOSE_PREFERRED_DESIGN')}
						</p>
					</div>
				</div>

				{/* Layout options - side by side */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{layouts.map((layout) => {
						const isActive = layoutHome === layout.key;
						return (
							<button
								key={layout.key}
								onClick={() => handleLayoutChange(layout.key)}
								disabled={disabled}
								className={cn(
									'relative flex flex-col items-center gap-3 p-4 rounded-xl',
									'transition-all duration-300',
									'border-2',
									'overflow-hidden',
									'group/layout',
									isActive
										? 'bg-gradient-to-br from-theme-primary-50/50 via-white to-theme-primary-100/30 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-theme-primary-950/30 border-theme-primary-400/50 dark:border-theme-primary-500/50 shadow-lg shadow-theme-primary-200/30 dark:shadow-theme-primary-900/20'
										: 'bg-white/80 dark:bg-white/4 border-gray-200/50 dark:border-white/6 hover:border-theme-primary-300 dark:hover:border-theme-primary-600 hover:shadow-md',
									disabled && 'opacity-50 cursor-not-allowed',
									!disabled && 'active:scale-[0.98]'
								)}
							>
								{/* Active indicator */}
								{isActive && (
									<div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#0a0a0a] animate-pulse z-10" />
								)}

								{/* Layout preview image */}
								<div className="relative w-full h-32 rounded-lg overflow-hidden">
									<div
										className={cn(
											'absolute inset-0',
											layout.key === LayoutHome.HOME_ONE
												? 'bg-gradient-to-br from-theme-primary-100/20 to-theme-primary-200/20 dark:from-theme-primary-900/20 dark:to-theme-primary-800/20'
												: 'bg-gradient-to-br from-purple-100/20 to-pink-100/20 dark:from-purple-900/20 dark:to-pink-900/20'
										)}
									/>
									<Image
										src={layout.imageSrc}
										alt={`${layout.name} Layout Preview`}
										fill
										className="object-cover object-top transition-all duration-500"
										sizes="(max-width: 768px) 50vw, 200px"
									/>
									{/* Overlay on hover */}
									<div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent opacity-0 group-hover/layout:opacity-100 transition-opacity duration-300" />
								</div>

								{/* Layout label and icon */}
								<div className="flex items-center gap-2">
									<div
										className={cn(
											'p-1.5 rounded-md transition-colors',
											isActive
												? 'bg-gradient-to-br from-theme-primary-500 to-theme-primary-600 text-white'
												: 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400'
										)}
									>
										{layout.icon}
									</div>
									<span
										className={cn(
											'text-sm font-semibold',
											isActive
												? 'text-theme-primary-600 dark:text-theme-primary-400'
												: 'text-gray-700 dark:text-gray-300'
										)}
									>
										{layout.label}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default SelectLayout;
