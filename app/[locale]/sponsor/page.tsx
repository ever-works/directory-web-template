import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCachedItems } from '@/lib/content';
import { SponsorForm } from '@/components/sponsor-ads';
import { Megaphone, Globe, TrendingUp, BadgeCheck, Sparkles, Shield } from 'lucide-react';
import Link from 'next/link';
import { getSponsorAdPricingConfig, getSponsorAdsEnabled } from '@/lib/utils/settings';
import DecorativeBg from '@/components/shared/decorative-bg';

export default async function SponsorPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const session = await auth();
	const t = await getTranslations('sponsor');

	// Check if sponsor ads feature is enabled
	const sponsorAdsEnabled = getSponsorAdsEnabled();
	if (!sponsorAdsEnabled) {
		notFound();
	}

	// Get pricing configuration
	const pricingConfig = getSponsorAdPricingConfig();

	// Check if user is authenticated
	if (!session?.user?.id) {
		redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/sponsor`);
	}

	// Get all items and filter by user's submitted items
	const { items: allItems } = await getCachedItems({ lang: locale });

	// Filter items submitted by this user
	const userItems = allItems.filter((item) => (item as { submitted_by?: string }).submitted_by === session.user.id);

	return (
		<div className="w-full min-h-screen bg-white dark:bg-[#0b111f]">
			<div className="relative z-10 px-4">
				<DecorativeBg reverse className="-mt-14!" />

				{/* Header */}
				<div className="text-center mb-12 -mt-[80px] animate-fade-in-up">
					<div className="flex items-center justify-center mb-6">
						<div className="flex items-center text-gray-600 dark:text-gray-200 bg-gray-200 dark:bg-[#1F2937] py-2 px-4 rounded-full gap-2 text-sm font-medium">
							<div className="w-2 h-2 bg-theme-primary-500 rounded-full animate-pulse" />
							{t('BADGE_TEXT')}
						</div>
					</div>

					<h1 className="font-bold mb-4">
						<span className="text-xl md:text-2xl text-gray-600 dark:text-white mb-4">
							{t('PAGE_TITLE_PART1')}
						</span>
						<br className="hidden md:block" />
						<span className="text-4xl md:text-5xl bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">
							{t('PAGE_TITLE_PART2')}
						</span>
					</h1>

					<p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
						{t('PAGE_DESCRIPTION')}
					</p>

					{/* Trust Indicators */}
					<div className="mt-8 inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/60 dark:bg-gray-900/40 backdrop-blur-md">
						<div className="flex items-center gap-2 px-4 py-2">
							<div className="w-5 h-5 rounded-full bg-green-500/15 dark:bg-green-500/20 flex items-center justify-center">
								<Shield className="w-3 h-3 text-green-600 dark:text-green-400" />
							</div>
							<span className="text-xs text-green-700 dark:text-green-300">
								{t('TRUST_SECURE')}
							</span>
						</div>
						<div className="w-px h-5 bg-gray-200/80 dark:bg-gray-700/60 rounded-full" />
						<div className="flex items-center gap-2 px-4 py-2">
							<div className="w-5 h-5 rounded-full bg-purple-500/15 dark:bg-purple-500/20 flex items-center justify-center">
								<Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
							</div>
							<span className="text-xs text-purple-700 dark:text-purple-300">
								{t('TRUST_INSTANT')}
							</span>
						</div>
					</div>
				</div>

				{/* Benefits */}
				<div className="mb-16 grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
					<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700/30 bg-white/80 dark:bg-gray-800/50 backdrop-blur-xs p-6 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-300">
						<div className="absolute opacity-70 dark:opacity-100 -top-6 -left-6 w-24 h-24 rounded-full bg-linear-to-br from-theme-primary-500/20 via-purple-500/15 to-transparent blur-xl pointer-events-none" />
						<div className="relative flex items-start gap-4">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 shadow-sm">
								<Globe className="h-6 w-6 text-theme-primary-500 dark:text-theme-primary-400" />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
									{t('BENEFIT_VISIBILITY_TITLE')}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{t('BENEFIT_VISIBILITY_DESCRIPTION')}
								</p>
							</div>
						</div>
					</div>

					<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700/30 bg-white/80 dark:bg-gray-800/50 backdrop-blur-xs p-6 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-300">
						<div className="absolute opacity-70 dark:opacity-100 -top-6 -left-6 w-24 h-24 rounded-full bg-linear-to-br from-purple-500/20 via-theme-primary-500/15 to-transparent blur-xl pointer-events-none" />
						<div className="relative flex items-start gap-4">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 shadow-sm">
								<TrendingUp className="h-6 w-6 text-theme-primary-500 dark:text-theme-primary-400" />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
									{t('BENEFIT_TRAFFIC_TITLE')}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{t('BENEFIT_TRAFFIC_DESCRIPTION')}
								</p>
							</div>
						</div>
					</div>

					<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700/30 bg-white/80 dark:bg-gray-800/50 backdrop-blur-xs p-6 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-300">
						<div className="absolute opacity-70 dark:opacity-100 -top-6 -left-6 w-24 h-24 rounded-full bg-linear-to-br from-theme-primary-500/20 via-purple-500/15 to-transparent blur-xl pointer-events-none" />
						<div className="relative flex items-start gap-4">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 shadow-sm">
								<BadgeCheck className="h-6 w-6 text-theme-primary-500 dark:text-theme-primary-400" />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
									{t('BENEFIT_BADGE_TITLE')}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{t('BENEFIT_BADGE_DESCRIPTION')}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Form or Empty State */}
				<div className="relative max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
					{/* Animated Radar Circles — clipped to top half */}
					<div className="absolute -top-20 left-1/2 -translate-x-1/2 pointer-events-none">
						<div className="relative overflow-hidden w-[650px] h-[350px]">
							<div className="absolute bottom-0 left-1/2 w-0 h-0">
								<div
									className="absolute -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-theme-primary-400/20 dark:border-theme-primary-500/45 animate-ping"
									style={{ animationDuration: '4s', animationDelay: '0.5s', boxShadow: 'inset 0 0 60px rgb(var(--theme-primary-400) / 0.20)' }}
								/>
								<div
									className="absolute -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-purple-500/50 dark:border-theme-primary-500/55 animate-ping"
									style={{ animationDuration: '4s', animationDelay: '1.3s', boxShadow: 'inset 0 0 60px rgb(var(--theme-primary-400) / 0.35)' }}
								/>
								<div
									className="absolute -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-theme-primary-400/55 dark:border-theme-primary-500/65 animate-ping"
									style={{ animationDuration: '4s', animationDelay: '2.6s', boxShadow: 'inset 0 0 60px rgb(var(--theme-primary-400) / 0.55)' }}
								/>
							</div>
						</div>
					</div>

					<div className="relative z-10">
						{userItems.length > 0 ? (
							<div className="relative mx-auto max-w-2xl">
								<div className="absolute dark:opacity-65 -top-28 inset-0 -z-10 rounded-full bg-linear-to-r from-theme-primary-500/20 via-purple-500/20 to-theme-primary-500/20 dark:from-theme-primary-500/25 dark:via-purple-500/25 dark:to-theme-primary-500/25 blur-3xl translate-y-4" />
								<div className="rounded-2xl p-2 border border-theme-primary-200/70 dark:border-gray-800 bg-white dark:bg-gray-800/30">
									<div className="rounded-xl border border-theme-primary-200/70 dark:border-gray-800 bg-white dark:bg-gray-800/30">
										<SponsorForm items={userItems} locale={locale} pricingConfig={pricingConfig} />
									</div>
								</div>
							</div>
						) : (
							<div className="relative mx-auto max-w-md text-center">
								<div className="absolute dark:opacity-65 -top-28 inset-0 -z-10 rounded-full bg-linear-to-r from-theme-primary-500/20 via-purple-500/20 to-theme-primary-500/20 dark:from-theme-primary-500/25 dark:via-purple-500/25 dark:to-theme-primary-500/25 blur-3xl translate-y-4" />
								<div className="rounded-2xl p-2 border border-theme-primary-200/70 dark:border-gray-800 bg-white dark:bg-gray-800/30">
									<div className="rounded-xl border border-theme-primary-200/70 dark:border-gray-800 p-8 bg-white dark:bg-gray-800/30">
										<div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-theme-primary-500 to-theme-primary-600">
											<Megaphone className="h-8 w-8 text-white" />
										</div>
										<h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
											{t('NO_ITEMS_TITLE')}
										</h2>
										<p className="mb-6 text-gray-600 dark:text-gray-400">{t('NO_ITEMS_DESCRIPTION')}</p>
										<Link
											href={`/${locale}/submit`}
											className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-theme-primary-500 to-theme-primary-600 hover:from-theme-primary-600 hover:to-theme-primary-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-theme-primary-500/25 hover:shadow-2xl transition-all duration-300"
										>
											{t('SUBMIT_ITEM_CTA')}
										</Link>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="pb-16" />
			</div>
		</div>
	);
}
