import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	generateBreadcrumbSchema,
	generateOrganizationSchema,
	generateProductSchema,
	generateWebSiteSchema,
	jsonLdScript
} from '../schema';
import { breadcrumbTrail } from '../breadcrumb-trail';
import { siteConfig } from '../../config/client';

/**
 * JSON-LD fixes of Spec 062 (lib/seo/schema.ts, lib/seo/breadcrumb-trail.ts).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */

describe('generateProductSchema (no fabricated data)', () => {
	const base = { name: 'Toggl', description: 'Tracks time', url: 'https://x.test/items/toggl' };

	it('publishes no Offer and no brand of its own', () => {
		const schema = generateProductSchema({ ...base, sourceUrl: 'https://toggl.com' }) as Record<string, unknown>;
		assert.equal('offers' in schema, false, 'an Offer without a price is invented');
		assert.equal('brand' in schema, false);
		assert.equal(schema.sameAs, 'https://toggl.com', "the item's own website identifies it");
	});

	it("uses the item's brand when it names one, and ignores a non-http website", () => {
		const schema = generateProductSchema({ ...base, brandName: 'Toggl OÜ', sourceUrl: 'javascript:alert(1)' }) as Record<
			string,
			unknown
		>;
		assert.deepEqual(schema.brand, { '@type': 'Brand', name: 'Toggl OÜ' });
		assert.equal('sameAs' in schema, false);
	});
});

describe('identity overrides', () => {
	it('Organization and WebSite use the server-resolved name and origin', () => {
		const organization = generateOrganizationSchema({ name: 'Awesome Time', url: 'https://time.example', description: 'D' });
		assert.equal(organization.name, 'Awesome Time');
		assert.equal(organization.url, 'https://time.example');
		// The configured logo (NEXT_PUBLIC_SITE_LOGO) resolved against the override origin:
		// a relative path lands on it, an absolute URL is kept as configured.
		assert.equal(organization.logo, new URL(siteConfig.logo, 'https://time.example/').toString());

		const website = generateWebSiteSchema('fr', { name: 'Awesome Time', url: 'https://time.example/' });
		assert.equal(website.url, 'https://time.example/fr');
		assert.equal(website.inLanguage, 'fr');
		assert.equal(website.potentialAction.target.urlTemplate, 'https://time.example/fr?q={search_term_string}');
	});
});

describe('breadcrumbs', () => {
	it('keeps the current page as a last crumb without a URL', () => {
		const trail = breadcrumbTrail(
			[{ name: 'Home', url: '/' }, { name: 'Categories', url: '/categories' }, { name: 'Time Tracking' }],
			'https://x.test'
		);
		assert.deepEqual(trail, [
			{ name: 'Home', url: 'https://x.test/' },
			{ name: 'Categories', url: 'https://x.test/categories' },
			{ name: 'Time Tracking' }
		]);
		const schema = generateBreadcrumbSchema(trail!);
		assert.deepEqual(schema.itemListElement[2], { '@type': 'ListItem', position: 3, name: 'Time Tracking' });
		assert.equal(schema.itemListElement[0].item, 'https://x.test/');
	});

	it('drops URL-less middle crumbs and trails shorter than two', () => {
		assert.deepEqual(
			breadcrumbTrail([{ name: 'Home', url: '/' }, { name: 'Gap' }, { name: 'Page', url: 'https://x.test/p' }], 'https://x.test'),
			[
				{ name: 'Home', url: 'https://x.test/' },
				{ name: 'Page', url: 'https://x.test/p' }
			]
		);
		assert.equal(breadcrumbTrail([{ name: 'Home', url: '/' }], 'https://x.test'), null);
		assert.equal(breadcrumbTrail([], 'https://x.test'), null);
	});
});

describe('jsonLdScript', () => {
	it('escapes every < so a value cannot close the script block', () => {
		const html = jsonLdScript({ name: '</script><script>alert(1)</script>' });
		assert.equal(html.includes('<'), false);
		assert.deepEqual(JSON.parse(html), { name: '</script><script>alert(1)</script>' });
	});
});
