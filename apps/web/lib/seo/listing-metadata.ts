import { Metadata } from 'next';
import { getSiteName, getSiteDescription } from '@/lib/seo/site-identity';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { generateHreflangAlternates } from './hreflang';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { toMetaDescription } from './meta-text';

interface ListingMetadataOptions {
	title: string;
	description?: string;
	path: string;
	locale: string;
	itemCount?: number;
	keywords?: string[];
	imageUrl?: string;
	/**
	 * If true, advertise a Markdown mirror at `<canonical>.md` via
	 * `<link rel="alternate" type="text/markdown" href="...">`. Set
	 * for any listing/detail page that has a corresponding `.md` route.
	 */
	hasMarkdownMirror?: boolean;
	/** Use `title` as the whole `<title>` (no " | <site>" suffix), e.g. the home page. */
	absoluteTitle?: boolean;
	/**
	 * Query string (without `?`) that is part of the canonical URL, e.g.
	 * `page=2` for a paginated listing: each page is its own canonical, as
	 * Google recommends, instead of all of them claiming to be page 1.
	 */
	canonicalQuery?: string;
}

export async function generateListingMetadata({
	title,
	description,
	path,
	locale,
	itemCount,
	keywords,
	imageUrl,
	hasMarkdownMirror,
	absoluteTitle,
	canonicalQuery,
}: ListingMetadataOptions): Promise<Metadata> {
	const appUrl = getBaseUrl();
	const siteName = await getSiteName();
	const fullTitle = absoluteTitle ? title : `${title} | ${siteName}`;
	const metaDescription = toMetaDescription(
		description || `Browse ${itemCount ? `${itemCount} ` : ''}${title.toLowerCase()}. ${await getSiteDescription()}`,
		160
	);
	const query = canonicalQuery ? `?${canonicalQuery}` : '';
	const pagePath = `${path}${query}`;
	const canonicalUrl = `${appUrl}${locale === DEFAULT_LOCALE ? '' : `/${locale}`}${pagePath}`;
	// A page that sets `openGraph` without images loses the root file-based image,
	// so listings name the site-wide card (app/opengraph-image.tsx) themselves.
	const ogImage = imageUrl ?? `${appUrl.replace(/\/+$/, '')}/opengraph-image`;

	return {
		title: fullTitle,
		description: metaDescription,
		keywords: keywords?.join(', '),
		openGraph: {
			title: fullTitle,
			description: metaDescription,
			type: 'website',
			siteName,
			url: canonicalUrl,
			images: [{ url: ogImage, ...(imageUrl ? {} : { width: 1200, height: 630 }) }],
		},
		twitter: {
			card: 'summary_large_image',
			title: fullTitle,
			description: metaDescription,
			images: [ogImage],
		},
		alternates: {
			canonical: canonicalUrl,
			languages: generateHreflangAlternates(pagePath),
			// The Markdown twin mirrors the unpaginated listing only.
			...(hasMarkdownMirror && !query && {
				types: { 'text/markdown': `${canonicalUrl}.md` },
			}),
		},
	};
}
