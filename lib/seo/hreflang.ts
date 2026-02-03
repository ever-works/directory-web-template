/**
 * Hreflang Tags Utility
 * Generates language alternates for SEO to help search engines understand localized pages
 */

import { siteConfig } from '@/lib/config/client';
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/constants';

/**
 * Mapping of locale codes to their hreflang values
 * Most locales use the same code, but some need special handling
 */
const LOCALE_TO_HREFLANG: Record<Locale, string> = {
	en: 'en',
	fr: 'fr',
	es: 'es',
	de: 'de',
	zh: 'zh',
	ar: 'ar',
	he: 'he',
	ru: 'ru',
	uk: 'uk',
	pt: 'pt',
	it: 'it',
	ja: 'ja',
	ko: 'ko',
	nl: 'nl',
	pl: 'pl',
	tr: 'tr',
	vi: 'vi',
	th: 'th',
	hi: 'hi',
	id: 'id',
	bg: 'bg'
};

/**
 * Generates the full URL for a given path and locale
 * Follows the "as-needed" locale prefix pattern:
 * - Default locale (en) has no prefix
 * - Other locales have /{locale}/ prefix
 *
 * @param path - The path without locale prefix (e.g., "/items/my-app" or "/about")
 * @param locale - The target locale
 * @returns Full URL with proper locale prefix
 */
function getLocalizedUrl(path: string, locale: Locale): string {
	const baseUrl = siteConfig.url.replace(/\/$/, ''); // Remove trailing slash if present
	const cleanPath = path.startsWith('/') ? path : `/${path}`;

	if (locale === DEFAULT_LOCALE) {
		// Default locale (en) has no prefix
		return `${baseUrl}${cleanPath}`;
	}

	// Other locales have /{locale}/ prefix
	return `${baseUrl}/${locale}${cleanPath}`;
}

/**
 * Generates hreflang alternates for Next.js metadata
 * Returns an object compatible with Next.js Metadata.alternates.languages
 *
 * @param path - The path without locale prefix (e.g., "/items/my-app" or "/about")
 *               For root pages, pass "/" or ""
 * @returns Object with languages alternates for Next.js metadata
 *
 * @example
 * // In generateMetadata function:
 * export async function generateMetadata({ params }) {
 *   const { locale } = await params;
 *   return {
 *     alternates: {
 *       canonical: `/${locale}/about`,
 *       languages: generateHreflangAlternates('/about')
 *     }
 *   };
 * }
 */
export function generateHreflangAlternates(path: string): Record<string, string> {
	const languages: Record<string, string> = {};

	// Generate alternate URLs for all locales
	for (const locale of LOCALES) {
		const hreflang = LOCALE_TO_HREFLANG[locale];
		languages[hreflang] = getLocalizedUrl(path, locale);
	}

	// Add x-default pointing to the default locale version
	languages['x-default'] = getLocalizedUrl(path, DEFAULT_LOCALE);

	return languages;
}

/**
 * Generates hreflang alternates for dynamic item pages
 * Convenience function for item detail pages
 *
 * @param slug - The item slug
 * @returns Object with languages alternates for Next.js metadata
 *
 * @example
 * // In items/[slug]/page.tsx generateMetadata:
 * return {
 *   alternates: {
 *     canonical: `${appUrl}/${locale}/items/${slug}`,
 *     languages: generateItemHreflangAlternates(slug)
 *   }
 * };
 */
export function generateItemHreflangAlternates(slug: string): Record<string, string> {
	return generateHreflangAlternates(`/items/${slug}`);
}

/**
 * Generates hreflang alternates for dynamic CMS pages
 * Convenience function for pages/[slug] routes
 *
 * @param slug - The page slug
 * @returns Object with languages alternates for Next.js metadata
 */
export function generatePageHreflangAlternates(slug: string): Record<string, string> {
	return generateHreflangAlternates(`/pages/${slug}`);
}
