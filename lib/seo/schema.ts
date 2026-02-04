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
 * Includes social profiles (sameAs) and contact point for Knowledge Panel visibility
 */
export function generateOrganizationSchema() {
	// Build sameAs array from social profiles, filtering out empty values
	const sameAs = [
		siteConfig.social.github,
		siteConfig.social.x,
		siteConfig.social.linkedin,
		siteConfig.social.facebook,
		siteConfig.social.blog
	].filter(Boolean);

	const schema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: siteConfig.brandName,
		url: siteConfig.url,
		logo: `${siteConfig.url}${siteConfig.logo}`,
		description: siteConfig.description
	};

	// Only add sameAs if there are valid social profiles
	if (sameAs.length > 0) {
		schema.sameAs = sameAs;
	}

	// Add contact point if email is configured
	if (siteConfig.social.email) {
		schema.contactPoint = {
			'@type': 'ContactPoint',
			email: siteConfig.social.email,
			contactType: 'customer service'
		};
	}

	return schema;
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
