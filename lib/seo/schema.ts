/**
 * SEO Schema.org Structured Data Utilities
 * Generates JSON-LD schemas for various content types
 */

import { siteConfig } from '@/lib/config/client';

export interface ProductSchemaInput {
	name: string;
	description: string;
	image?: string;
	url: string;
	category?: string;
	sourceUrl?: string;
	brandName?: string;
}

/**
 * Generate Product schema for item detail pages
 */
export function generateProductSchema(input: ProductSchemaInput) {
	const schema: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: input.name,
		description: input.description,
		url: input.url
	};

	// Add optional fields
	if (input.image) {
		schema.image = input.image;
	}

	if (input.category) {
		schema.category = input.category;
	}

	if (input.brandName) {
		schema.brand = {
			'@type': 'Brand',
			name: input.brandName
		};
	}

	// Add offer if source URL is available
	if (input.sourceUrl) {
		schema.offers = {
			'@type': 'Offer',
			url: input.sourceUrl,
			availability: 'https://schema.org/InStock'
		};
	}

	return schema;
}

/**
 * Generate Organization schema for brand identity
 */
export function generateOrganizationSchema() {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: siteConfig.brandName,
		url: siteConfig.url,
		logo: `${siteConfig.url}${siteConfig.logo}`,
		description: siteConfig.description
	};
}

/**
 * Generate WebSite schema with search action
 */
export function generateWebSiteSchema(locale: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: siteConfig.name,
		url: `${siteConfig.url}/${locale}`,
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${siteConfig.url}/${locale}?q={search_term_string}`
			},
			'query-input': 'required name=search_term_string'
		}
	};
}

export interface BreadcrumbItem {
	name: string;
	url: string;
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.url
		}))
	};
}
