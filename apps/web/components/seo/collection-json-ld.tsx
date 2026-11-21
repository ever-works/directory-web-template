/**
 * CollectionJsonLd — server component that emits a Schema.org
 * `CollectionPage` whose `mainEntity` is an `ItemList` of the listed items
 * (absolute URLs), for listing pages: home / discover, a category, a tag
 * (Spec 062). Renders nothing visible.
 *
 * Item URLs are built like every internal link: `/<locale?>/items/<slug>`
 * on the public origin (getBaseUrl()). The list is capped by
 * `generateCollectionSchema` (MAX_COLLECTION_SCHEMA_ITEMS).
 */

import { generateCollectionSchema, jsonLdScript } from '@/lib/seo/schema';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { DEFAULT_LOCALE } from '@/lib/constants';

interface CollectionJsonLdProps {
	name: string;
	description?: string;
	/** Path of the page without the locale prefix (`''` for the home page). */
	path: string;
	locale: string;
	/** Total number of items the listing has (all pages). */
	total: number;
	/** The items shown on this page, in display order. */
	items: ReadonlyArray<{ slug?: string; name?: string }>;
}

export function CollectionJsonLd({ name, description, path, locale, total, items }: CollectionJsonLdProps) {
	const base = getBaseUrl().replace(/\/+$/, '');
	const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
	const schema = generateCollectionSchema({
		name,
		description: description || undefined,
		url: `${base}${localePrefix}${path}` || base,
		itemCount: total,
		items: items
			.filter((item) => typeof item.slug === 'string' && item.slug)
			.map((item) => ({
				name: typeof item.name === 'string' ? item.name : '',
				url: `${base}${localePrefix}/items/${encodeURIComponent(item.slug as string)}`
			}))
	});

	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }} />;
}
