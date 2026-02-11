import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './[locale]/globals.scss';
import { LayoutProvider, ThemeProvider } from '@/components/providers';
import { siteConfig } from '@/lib/config';
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';
import { cleanUrl } from '@/lib/utils/url-cleaner';
import { getLocale } from 'next-intl/server';
import { RTL_LOCALES, type Locale } from '@/lib/constants';

const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");
const appUrl = cleanUrl(rawUrl);

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin']
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin']
});

export const metadata: Metadata = {
	metadataBase: new URL(appUrl),
	title: `404 - Page Not Found | ${siteConfig.name}`,
	description: "The page you're looking for doesn't exist.",
	robots: 'noindex'
};

// Initialize background jobs - singleton pattern ensures this runs only ONCE
// even though layout renders on every request. See: app/api/cron/jobs/background-jobs-init.ts
ensureBackgroundJobsInitialized().catch(err =>
	console.error('[BackgroundJobs] Initialization failed:', err)
);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const locale = await getLocale();
	const dir = RTL_LOCALES.includes(locale as Locale) ? 'rtl' : 'ltr';

	return (
		<html lang={locale} dir={dir} suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased dark:bg-dark--theme-950`} suppressHydrationWarning>
				<ThemeProvider>
					<LayoutProvider>{children}</LayoutProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
