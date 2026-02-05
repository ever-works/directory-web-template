import { Metadata } from 'next';
import { siteConfig } from '@/lib/config';
import { generateHreflangAlternates } from './hreflang';

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
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url;
	const fullTitle = `${title} | ${siteConfig.name}`;
	const metaDescription =
		description || `Browse ${itemCount ? `${itemCount} ` : ''}${title.toLowerCase()}. ${siteConfig.description}`;
	const canonicalUrl = `${appUrl}${locale === 'en' ? '' : `/${locale}`}${path}`;

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
