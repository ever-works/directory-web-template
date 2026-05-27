/**
 * BreadcrumbJsonLd — server component that emits a Schema.org
 * `BreadcrumbList` as a `<script type="application/ld+json">` block.
 *
 * Use on every public page that has a navigational trail, so AI agents
 * and search engines can understand the site hierarchy without parsing
 * the rendered HTML breadcrumb. Pair with the visible `<Breadcrumb>` UI;
 * this component intentionally renders nothing visible.
 *
 * @example
 * ```tsx
 * <BreadcrumbJsonLd
 *     items={[
 *         { name: 'Home', url: 'https://example.com/' },
 *         { name: 'Categories', url: 'https://example.com/categories' },
 *         { name: 'AI Tools' }, // last crumb — current page, URL omitted
 *     ]}
 * />
 * ```
 */

import { generateBreadcrumbSchema, type BreadcrumbItem } from '@/lib/seo/schema';
import { getBaseUrl } from '@/lib/utils/url-cleaner';

interface BreadcrumbJsonLdProps {
	/**
	 * Breadcrumb trail from root to current page. Each entry's `url` is
	 * resolved to absolute via the configured base URL (`NEXT_PUBLIC_APP_URL`).
	 *
	 * Convention: omit `url` on the last item to mark the current page.
	 * Schema.org allows `BreadcrumbList` items without `item` URLs and
	 * Google explicitly recommends this pattern for the trailing crumb.
	 */
	items: ReadonlyArray<{ name: string; url?: string }>;
}

function toAbsoluteUrl(url: string, baseUrl: string): string {
	if (/^https?:\/\//i.test(url)) return url;
	const cleanBase = baseUrl.replace(/\/$/, '');
	const cleanPath = url.startsWith('/') ? url : `/${url}`;
	return `${cleanBase}${cleanPath}`;
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
	if (items.length === 0) return null;

	const baseUrl = getBaseUrl();

	const schemaItems: BreadcrumbItem[] = items
		.filter((item) => item.url) // BreadcrumbList items must have a URL to be useful
		.map((item) => ({
			name: item.name,
			url: toAbsoluteUrl(item.url!, baseUrl)
		}));

	if (schemaItems.length === 0) return null;

	const schema = generateBreadcrumbSchema(schemaItems);

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				// Why: escape every '<' as the < JSON unicode escape so a
				// stray '</script>' inside any breadcrumb name (or any future
				// untrusted string we serialise here) can't terminate this
				// inline <script> block and inject HTML. The browser still
				// parses the value as the literal character at JSON-decode
				// time, so it round-trips losslessly into the parsed schema.
				__html: JSON.stringify(schema).replace(/</g, '\\u003c')
			}}
		/>
	);
}
