'use client';

import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiArrowLeft, FiCheck, FiDroplet } from 'react-icons/fi';
import Link from 'next/link';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';

const getThemeButtonClasses = (isSelected: boolean) =>
	cn(
		'group relative p-6 rounded-xl border-2 transition-all duration-300 text-left',
		'focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500 hover:shadow-lg',
		isSelected
			? 'border-theme-primary-500 bg-gradient-to-br from-theme-primary-50 to-theme-primary-100 dark:from-theme-primary-900/30 dark:to-theme-primary-800/20 shadow-lg shadow-theme-primary-500/20'
			: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-theme-primary-300 dark:hover:border-theme-primary-600 hover:bg-gray-50 dark:hover:bg-gray-800'
	);

export default function ThemeColorsPage() {
	const locale = useLocale();
	const t = useTranslations('settings.THEME_COLORS_PAGE');
	const { themeKey, availableThemes, changeTheme } = useTheme();

	if (!availableThemes || availableThemes.length === 0) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<p className="text-gray-500 dark:text-gray-400">{t('UNABLE_TO_LOAD_THEMES')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
			<Container maxWidth="7xl" padding="default">
				<div className="space-y-12 py-8">
					{/* Header */}
					<div className="flex items-center gap-4">
						<Link
							href={`/${locale}/client/settings`}
							className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
						>
							<FiArrowLeft className="w-4 h-4" />
							{t('BACK_TO_SETTINGS')}
						</Link>
					</div>

					{/* Page Header */}
					<div className="text-center space-y-4">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-theme-primary-100 to-theme-primary-200 dark:from-theme-primary-900/40 dark:to-theme-primary-800/40 rounded-2xl mb-4">
							<FiDroplet className="w-8 h-8 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t('TITLE')}</h1>
						<p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed">
							{t('DESCRIPTION')}
						</p>
					</div>

					{/* Theme Selector */}
					<Card className="hover:shadow-lg hover:shadow-theme-primary-500/10 border border-gray-200 dark:border-gray-800 transition-all duration-300 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
						<CardHeader className="pb-6">
							<CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
								<FiDroplet className="w-5 h-5 text-theme-primary-600 dark:text-theme-primary-400" />
								{t('CHOOSE_THEME')}
							</CardTitle>
							<p className="text-gray-500 dark:text-gray-400 text-sm">{t('CHOOSE_THEME_DESC')}</p>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{availableThemes.map((theme) => {
									const isSelected = themeKey === theme.key;
									return (
										<button
											key={theme.key}
											type="button"
											onClick={() => changeTheme(theme.key)}
											aria-pressed={isSelected}
											className={getThemeButtonClasses(isSelected)}
										>
											{/* Selection Indicator */}
											{isSelected && (
												<div className="absolute top-3 right-3">
													<div className="flex items-center justify-center w-6 h-6 rounded-full bg-theme-primary-500 shadow-sm">
														<FiCheck className="w-4 h-4" />
													</div>
												</div>
											)}

											{/* Color Palette Preview */}
											<div className="flex items-center gap-3 mb-4">
												<div className="flex gap-1">
													<span
														className="inline-block w-8 h-6 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
														style={{ background: theme.colors.primary }}
													/>
													<span
														className="inline-block w-8 h-6 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
														style={{ background: theme.colors.secondary }}
													/>
													<span
														className="inline-block w-8 h-6 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
														style={{
															background:
																theme.colors.accent || theme.colors.primary || '#6366f1'
														}}
													/>
												</div>
												<div className="flex-1">
													<h3
														className={`font-semibold text-lg ${isSelected ? 'text-theme-primary-700 dark:text-theme-primary-400' : 'text-gray-900 dark:text-gray-100'} group-hover:text-theme-primary-700 dark:group-hover:text-theme-primary-400 transition-colors`}
													>
														{theme.label}
													</h3>
												</div>
											</div>

											{/* Description */}
											<p
												className={`text-sm leading-relaxed ${isSelected ? 'text-theme-primary-600 dark:text-theme-primary-300' : 'text-gray-600 dark:text-gray-300'}`}
											>
												{theme.description}
											</p>
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
