import { Metadata } from 'next';
import { siteConfig } from '@/lib/config';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { generateHreflangAlternates } from './hreflang';
import { getBaseUrl } from '@/lib/utils/url-cleaner';

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
}

export function generateListingMetadata({
	title,
	description,
	path,
	locale,
	itemCount,
	keywords,
	imageUrl,
	hasMarkdownMirror,
}: ListingMetadataOptions): Metadata {
	const appUrl = getBaseUrl();
	const fullTitle = `${title} | ${siteConfig.name}`;
	const metaDescription =
		description || `Browse ${itemCount ? `${itemCount} ` : ''}${title.toLowerCase()}. ${siteConfig.description}`;
	const canonicalUrl = `${appUrl}${locale === DEFAULT_LOCALE ? '' : `/${locale}`}${path}`;

	return {
		title: fullTitle,
		description: metaDescription,
		keywords: keywords?.join(', '),
		openGraph: {
			title: fullTitle,
			description: metaDescription,
			type: 'website',
			siteName: siteConfig.name,
			url: canonicalUrl,
			...(imageUrl && { images: [{ url: imageUrl }] }),
		},
		twitter: {
			card: 'summary_large_image',
			title: fullTitle,
			description: metaDescription,
		},
		alternates: {
			canonical: canonicalUrl,
			languages: generateHreflangAlternates(path),
			...(hasMarkdownMirror && {
				types: { 'text/markdown': `${canonicalUrl}.md` },
			}),
		},
	};
}
