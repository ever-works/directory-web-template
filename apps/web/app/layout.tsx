import type { Metadata } from 'next';
import { siteConfig } from '@/lib/config';
import './tailwind.css';
import './[locale]/globals.scss';
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';
import { getBaseUrl } from '@/lib/utils/url-cleaner';

// Public origin: NEXT_PUBLIC_CANONICAL_URL when pinned, else the app URL.
const appUrl = getBaseUrl();

// Root metadata used by `not-found.tsx` and any path outside `[locale]`.
// The `robots: 'noindex'` here is scoped to the not-found page — child
// layouts (e.g. `[locale]/layout.tsx`) override it via `generateMetadata`
// so public listings are indexable. If you change this default, also
// update those overrides.
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

/**
 * Pass-through root layout. The document (`<html lang dir>`, fonts, theme
 * providers) is rendered by `components/layout/document-shell.tsx`: from
 * `[locale]/layout.tsx` with the route's locale, and directly by the few pages
 * outside `[locale]` (`not-found.tsx`, `unauthorized/page.tsx`). Reading the
 * locale here with `getLocale()` made every page dynamic (Spec 061), because
 * this layout renders before `[locale]/layout.tsx` calls `setRequestLocale`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
	return children;
}
