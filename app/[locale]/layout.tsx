import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.scss';
import { getCachedConfig, getCachedItems } from '@/lib/content';
import { SurveyService } from '@/lib/services/survey.service';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'sonner';
import { PHProvider } from './integration/posthog/provider';
import PostHogPageView from './integration/posthog/page-view';
import { Locale } from '@/lib/constants';
import { Suspense } from 'react';
import Script from 'next/script';
import { ConditionalLayout } from '@/components/layout/conditional-layout';
import { siteConfig } from '@/lib/config';
import { SpeedInsights } from './integration/speed-insights';
import { Analytics } from './integration/analytics';
import { SettingsProvider } from '@/components/providers/settings-provider';
import { SettingsModalProvider } from '@/components/providers/settings-modal-provider';
import { SettingsModal } from '@/components/settings-modal';
import { NavigationLoadingBar } from '@/components/navigation-loading-bar';
import {
	getCategoriesEnabled,
	getTagsEnabled,
	getCompaniesEnabled,
	getSurveysEnabled,
	getHeaderSubmitEnabled,
	getHeaderPricingEnabled,
	getHeaderLayoutEnabled,
	getHeaderLanguageEnabled,
	getHeaderThemeEnabled,
	getHeaderMoreEnabled,
	getHeaderSettingsEnabled,
	getHeaderLayoutDefault,
	getHeaderPaginationDefault,
	getHeaderThemeDefault
} from '@/lib/utils/settings';
import { cleanUrl } from '@/lib/utils/url-cleaner';

const rawUrl =
	process.env.NEXT_PUBLIC_APP_URL?.trim() ||
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://demo.ever.works');
const appUrl = cleanUrl(rawUrl);

/**
 * Generate metadata dynamically using siteConfig
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params;
	return {
		metadataBase: new URL(appUrl),
		title: `${siteConfig.name} | ${siteConfig.tagline}`,
		description: siteConfig.description,
		keywords: siteConfig.keywords,
		openGraph: {
			title: `${siteConfig.name} | ${siteConfig.tagline}`,
			description: siteConfig.description,
			type: 'website',
			siteName: siteConfig.name
		},
		alternates: {
			canonical: `/${locale}`
		}
	};
}

export default async function RootLayout({
	children,
	params
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}>) {
	const { locale } = await params;

	if (!routing.locales.includes(locale as Locale)) {
		notFound();
	}

	// Ensure server-side i18n helpers use the current route locale
	// Next.js 16 / next-intl: unstable_setRequestLocale renamed to setRequestLocale
	setRequestLocale(locale);

	const config = await getCachedConfig();
	const messages = await getMessages();

	// Fetch items data server-side to determine existence flags
	// This is cached and shared across requests
	let categories: Awaited<ReturnType<typeof getCachedItems>>['categories'] = [];
	let tags: Awaited<ReturnType<typeof getCachedItems>>['tags'] = [];
	let collections: Awaited<ReturnType<typeof getCachedItems>>['collections'] = [];

	try {
		const itemsData = await getCachedItems({ lang: locale });
		categories = itemsData.categories;
		tags = itemsData.tags;
		collections = itemsData.collections;
	} catch (error) {
		// If content fetch fails (malformed YAML, file system errors, etc.), use empty arrays
		// This prevents the root layout from crashing
		console.error('[Layout] Failed to fetch cached items:', error);
	}

	// Read settings server-side for instant availability
	const categoriesEnabled = getCategoriesEnabled();
	const tagsEnabled = getTagsEnabled();
	const companiesEnabled = getCompaniesEnabled();
	const surveysEnabled = getSurveysEnabled();

	// Data existence flags (whether data exists in the database/content)
	const hasCategories = Array.isArray(categories) && categories.length > 0;
	const hasTags = Array.isArray(tags) && tags.length > 0;
	const hasCollections = Array.isArray(collections) && collections.length > 0;

	// Check if global surveys exist (only if surveys feature is enabled)
	let hasGlobalSurveys = false;
	if (surveysEnabled) {
		try {
			const surveyService = new SurveyService();
			const result = await surveyService.getMany({
				type: SurveyTypeEnum.GLOBAL,
				status: SurveyStatusEnum.PUBLISHED,
				limit: 1
			});
			hasGlobalSurveys = (result.surveys?.length || 0) > 0;
		} catch {
			// If database is not configured or query fails, assume no surveys
			hasGlobalSurveys = false;
		}
	}

	const headerSettings = {
		submitEnabled: getHeaderSubmitEnabled(),
		pricingEnabled: getHeaderPricingEnabled(),
		layoutEnabled: getHeaderLayoutEnabled(),
		languageEnabled: getHeaderLanguageEnabled(),
		themeEnabled: getHeaderThemeEnabled(),
		moreEnabled: getHeaderMoreEnabled(),
		settingsEnabled: getHeaderSettingsEnabled(),
		layoutDefault: getHeaderLayoutDefault(),
		paginationDefault: getHeaderPaginationDefault(),
		themeDefault: getHeaderThemeDefault()
	};

	// Determine if the current locale is RTL
	return (
		<>
			<Script src="https://assets.lemonsqueezy.com/lemon.js" strategy="beforeInteractive" />
			<PHProvider>
				<Suspense fallback={null}>
					<PostHogPageView />
				</Suspense>
				<NextIntlClientProvider messages={messages}>
					<Toaster position="bottom-right" richColors />
					<SettingsProvider
						categoriesEnabled={categoriesEnabled}
						tagsEnabled={tagsEnabled}
						companiesEnabled={companiesEnabled}
						surveysEnabled={surveysEnabled}
						hasCategories={hasCategories}
						hasTags={hasTags}
						hasCollections={hasCollections}
						hasGlobalSurveys={hasGlobalSurveys}
						headerSettings={headerSettings}
					>
						<SettingsModalProvider>
							<Providers config={config}>
								{/* Global navigation loading bar */}
								<NavigationLoadingBar />
								<ConditionalLayout>{children}</ConditionalLayout>
								{/* Settings Modal - Shared by header button */}
								<SettingsModal />
							</Providers>
						</SettingsModalProvider>
					</SettingsProvider>
				</NextIntlClientProvider>
			</PHProvider>
			{/*
				Vercel Speed Insights Integration
				- Automatically detects Vercel environment and Speed Insights availability
				- Gracefully degrades when not enabled or not on a paid plan
				- Supports environment variable configuration (NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED, NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE)
				- See: app/[locale]/integration/speed-insights/
			*/}
			<Suspense fallback={null}>
				<SpeedInsights />
			</Suspense>
			{/*
				Vercel Analytics Integration
				- Automatically detects Vercel environment and Analytics availability
				- Gracefully degrades when not enabled or not on a paid plan
				- Supports environment variable configuration (NEXT_PUBLIC_ANALYTICS_ENABLED, NEXT_PUBLIC_ANALYTICS_SAMPLE_RATE)
				- See: app/[locale]/integration/analytics/
			*/}
			<Suspense fallback={null}>
				<Analytics />
			</Suspense>
		</>
	);
}
