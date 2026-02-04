import { Metadata } from 'next';
import { siteConfig } from '@/lib/config';
import { LOCALES } from '@/lib/constants';

function generateHreflangAlternates(path: string): Record<string, string> {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url;
	const languages: Record<string, string> = {};

	for (const locale of LOCALES) {
		const localePath = locale === 'en' ? path : `/${locale}${path}`;
		languages[locale] = `${appUrl}${localePath}`;
	}
	languages['x-default'] = `${appUrl}${path}`;

	return languages;
}

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
