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

import { generateBreadcrumbSchema, jsonLdScript } from '@/lib/seo/schema';
import { breadcrumbTrail } from '@/lib/seo/breadcrumb-trail';
import { getBaseUrl } from '@/lib/utils/url-cleaner';

interface BreadcrumbJsonLdProps {
	/**
	 * Breadcrumb trail from root to current page. Each entry's `url` is
	 * resolved to absolute via getBaseUrl(): the pinned public origin
	 * (`NEXT_PUBLIC_CANONICAL_URL`) when set, else `NEXT_PUBLIC_APP_URL`.
	 *
	 * Convention: omit `url` on the last item to mark the current page.
	 * Schema.org allows `BreadcrumbList` items without `item` URLs and
	 * Google explicitly recommends this pattern for the trailing crumb.
	 */
	items: ReadonlyArray<{ name: string; url?: string }>;
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
	// The last crumb is kept without a URL (the current page); a trail of fewer
	// than two crumbs is not emitted (lib/seo/breadcrumb-trail.ts).
	const trail = breadcrumbTrail(items, getBaseUrl());
	if (!trail) return null;

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				// jsonLdScript escapes every '<' so a stray '</script>' inside a
				// breadcrumb name cannot terminate this inline <script> block.
				__html: jsonLdScript(generateBreadcrumbSchema(trail))
			}}
		/>
	);
}
