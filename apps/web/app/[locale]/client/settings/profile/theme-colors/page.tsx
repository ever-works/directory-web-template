'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiArrowLeft, FiCheck, FiDroplet } from 'react-icons/fi';
import Link from 'next/link';
import { useTheme } from '@/hooks/use-theme';
import { ThemeKey } from '@/components/context/LayoutThemeContext';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';

export default function ThemeColorsPage() {
	const locale = useLocale();
	const t = useTranslations('settings.THEME_COLORS_PAGE');
	const { themeKey, availableThemes, changeTheme } = useTheme();

	const [appliedKey, setAppliedKey] = useState<string | null>(null);

	const handleChangeTheme = (key: ThemeKey) => {
		changeTheme(key);
		setAppliedKey(key);
		setTimeout(() => setAppliedKey(null), 1600);
	};

	if (!availableThemes || availableThemes.length === 0) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#0a0a0a]">
				<p className="text-sm text-gray-500 dark:text-gray-400">{t('UNABLE_TO_LOAD_THEMES')}</p>
			</div>
		);
	}

	const activeTheme = availableThemes.find((th) => th.key === themeKey);

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 space-y-6">
					{/* Back link */}
					<div>
						<Link
							href={`/${locale}/client/settings`}
							className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
						>
							<FiArrowLeft className="w-3.5 h-3.5" />
							{t('BACK_TO_SETTINGS')}
						</Link>
					</div>

					{/* Page Header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 bg-theme-primary-100 dark:bg-theme-primary-900/40 rounded-xl flex items-center justify-center">
								<FiDroplet className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
							</div>
							<div>
								<h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
									{t('TITLE')}
								</h1>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('DESCRIPTION')}</p>
							</div>
						</div>

						{/* Active theme pill */}
						{activeTheme && (
							<div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-theme-primary-200 dark:border-theme-primary-700/50 bg-theme-primary-50 dark:bg-theme-primary-900/20 text-xs font-medium text-theme-primary-700 dark:text-theme-primary-300">
								<span
									className="w-2.5 h-2.5 rounded-full ring-1 ring-white/50"
									style={{ background: activeTheme.colors.primary }}
								/>
								{activeTheme.label}
							</div>
						)}
					</div>

					{/* Theme Selector */}
					<Card className="border border-gray-200 dark:border-white/6 bg-white dark:bg-[#111111] shadow-sm">
						<CardHeader className="pb-4 border-b border-gray-100 dark:border-white/[0.05]">
							<CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
								<FiDroplet className="w-4 h-4 text-theme-primary-500" />
								{t('CHOOSE_THEME')}
							</CardTitle>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('CHOOSE_THEME_DESC')}</p>
						</CardHeader>
						<CardContent className="p-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
								{availableThemes.map((theme) => {
									const isSelected = themeKey === theme.key;
									const justApplied = appliedKey === theme.key;

									return (
										<button
											key={theme.key}
											type="button"
											onClick={() => handleChangeTheme(theme.key as ThemeKey)}
											aria-pressed={isSelected}
											className={cn(
												'group relative text-left rounded-xl border-2 overflow-hidden transition-all duration-200',
												'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2',
												isSelected
													? 'border-theme-primary-500 shadow-sm shadow-theme-primary-500/20'
													: 'border-gray-200 dark:border-white/8 hover:border-theme-primary-300 dark:hover:border-theme-primary-600/50 hover:shadow-sm'
											)}
										>
											{/* Mini UI preview — mock nav bar + content skeleton */}
											<div className="h-16 w-full overflow-hidden bg-gray-50 dark:bg-white/5">
												{/* Mock nav bar */}
												<div
													className="h-6 w-full flex items-center px-2 gap-1.5"
													style={{ background: theme.colors.primary }}
												>
													<div className="w-2 h-2 rounded-full bg-white/40" />
													<div className="flex-1 h-1 rounded-full bg-white/20" />
													<div
														className="h-3 w-5 rounded"
														style={{ background: theme.colors.secondary + 'cc' }}
													/>
												</div>
												{/* Mock content skeleton */}
												<div className="px-2 pt-2 space-y-1.5">
													<div
														className="h-1 w-14 rounded-full opacity-60"
														style={{ background: theme.colors.primary }}
													/>
													<div className="flex gap-1">
														<div
															className="h-2.5 w-7 rounded"
															style={{ background: theme.colors.primary }}
														/>
														<div
															className="h-2.5 w-7 rounded opacity-30"
															style={{ background: theme.colors.secondary }}
														/>
													</div>
												</div>
											</div>

											{/* Card body */}
											<div
												className={cn(
													'p-3.5 transition-colors',
													isSelected
														? 'bg-theme-primary-50/60 dark:bg-theme-primary-900/10'
														: 'bg-white dark:bg-white/[0.02] group-hover:bg-gray-50/80 dark:group-hover:bg-white/[0.04]'
												)}
											>
												<div className="flex items-center justify-between mb-1">
													<h3
														className={cn(
															'text-sm font-semibold transition-colors',
															isSelected
																? 'text-theme-primary-700 dark:text-theme-primary-300'
																: 'text-gray-900 dark:text-gray-100 group-hover:text-theme-primary-700 dark:group-hover:text-theme-primary-400'
														)}
													>
														{theme.label}
													</h3>
													{isSelected && !justApplied && (
														<span className="flex items-center justify-center w-5 h-5 rounded-full bg-theme-primary-500">
															<FiCheck className="w-3 h-3 text-white" />
														</span>
													)}
												</div>
												<p
													className={cn(
														'text-xs leading-relaxed',
														isSelected
															? 'text-theme-primary-600 dark:text-theme-primary-400'
															: 'text-gray-500 dark:text-gray-400'
													)}
												>
													{theme.description}
												</p>
											</div>

											{/* "Applied" overlay — fades in then out */}
											{justApplied && (
												<div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/60 pointer-events-none animate-fade-in rounded-xl">
													<div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#1a1a1a] rounded-full shadow border border-theme-primary-200 dark:border-theme-primary-700">
														<FiCheck className="w-3.5 h-3.5 text-theme-primary-600 dark:text-theme-primary-400" />
														<span className="text-xs font-semibold text-theme-primary-700 dark:text-theme-primary-300">
															Applied
														</span>
													</div>
												</div>
											)}
										</button>
									);
								})}
							</div>
						</CardContent>
					</Card>
				</div>
			</Container>
		</div>
	);
}
