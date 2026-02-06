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
}

export function generateListingMetadata({
	title,
	description,
	path,
	locale,
	itemCount,
	keywords,
	imageUrl,
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
		},
	};
}
