import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCachedItems } from '@/lib/content';
import { SponsorForm } from '@/components/sponsor-ads';
import { Megaphone, Globe, TrendingUp, BadgeCheck, Sparkles, Shield } from 'lucide-react';
import Link from 'next/link';
import { getSponsorAdPricingConfig, getSponsorAdsEnabled } from '@/lib/utils/settings';

// Styling constants
const PAGE_WRAPPER =
	'min-h-screen bg-linear-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950';
const HEADER_BADGE =
	'inline-flex items-center text-gray-900 dark:text-gray-200 bg-gray-200 dark:bg-gray-800 py-2 px-4 rounded-full gap-2 text-sm font-medium';
const HEADER_TITLE = 'text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6';
const HEADER_GRADIENT_TEXT =
	'bg-linear-to-r from-theme-primary-600 via-theme-primary-500 to-theme-primary-400 bg-clip-text text-transparent';
const BENEFIT_CARD =
	'group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-lg hover:shadow-xl transition-all duration-300';
const BENEFIT_ICON_WRAPPER = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg';
const TRUST_INDICATOR = 'flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 dark:bg-gray-900/60';
const EMPTY_STATE_WRAPPER = 'mx-auto max-w-md text-center';
const EMPTY_STATE_CARD =
	'rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-8';

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
		<div className={PAGE_WRAPPER}>
			<div className="container mx-auto px-4 py-12 md:py-16">
				{/* Header */}
				<div className="mb-12 text-center animate-fade-in-up">
					<div className="flex items-center justify-center mb-6">
						<div className={HEADER_BADGE}>
							<div className="w-2 h-2 bg-theme-primary-500 rounded-full animate-pulse" />
							{t('BADGE_TEXT')}
						</div>
					</div>

					<div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-theme-primary-500 to-theme-primary-600 shadow-lg shadow-theme-primary/25">
						<Megaphone className="h-10 w-10 text-white" />
					</div>

					<h1 className={HEADER_TITLE}>
						{t('PAGE_TITLE_PART1')}
						<br className="hidden md:block" />
						<span className={HEADER_GRADIENT_TEXT}>{t('PAGE_TITLE_PART2')}</span>
					</h1>

					<p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
						{t('PAGE_DESCRIPTION')}
					</p>

					{/* Trust Indicators */}
					<div className="mt-8 inline-flex items-center gap-3 p-1 rounded-xl bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-xs border border-gray-300/30 dark:border-gray-700/30">
						<div className={TRUST_INDICATOR}>
							<Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
							<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
								{t('TRUST_SECURE')}
							</span>
						</div>
						<div className={TRUST_INDICATOR}>
							<Sparkles className="w-4 h-4 text-gray-600 dark:text-gray-400" />
							<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
								{t('TRUST_INSTANT')}
							</span>
						</div>
					</div>
				</div>

				{/* Benefits */}
				<div className="mb-12 grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
					<div className={BENEFIT_CARD}>
						<div className="absolute inset-0 bg-linear-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						<div className="relative flex items-start gap-4">
							<div className={`${BENEFIT_ICON_WRAPPER} bg-linear-to-br from-green-500 to-emerald-600`}>
								<Globe className="h-6 w-6 text-white" />
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

					<div className={BENEFIT_CARD}>
						<div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						<div className="relative flex items-start gap-4">
							<div
								className={`${BENEFIT_ICON_WRAPPER} bg-linear-to-br from-theme-primary-500 to-cyan-600`}
							>
								<TrendingUp className="h-6 w-6 text-white" />
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

					<div className={BENEFIT_CARD}>
						<div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						<div className="relative flex items-start gap-4">
							<div className={`${BENEFIT_ICON_WRAPPER} bg-linear-to-br from-purple-500 to-pink-600`}>
								<BadgeCheck className="h-6 w-6 text-white" />
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
				{userItems.length > 0 ? (
					<div className="mx-auto max-w-2xl">
						<SponsorForm items={userItems} locale={locale} pricingConfig={pricingConfig} />
					</div>
				) : (
					<div className={EMPTY_STATE_WRAPPER}>
						<div className={EMPTY_STATE_CARD}>
							<div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-gray-400 to-gray-500">
								<Megaphone className="h-8 w-8 text-white" />
							</div>
							<h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
								{t('NO_ITEMS_TITLE')}
							</h2>
							<p className="mb-6 text-gray-600 dark:text-gray-400">{t('NO_ITEMS_DESCRIPTION')}</p>
							<Link
								href={`/${locale}/submit`}
								className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-theme-primary to-theme-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-theme-primary/25 hover:shadow-xl hover:shadow-theme-primary/30 transition-all duration-300"
							>
								{t('SUBMIT_ITEM_CTA')}
							</Link>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
