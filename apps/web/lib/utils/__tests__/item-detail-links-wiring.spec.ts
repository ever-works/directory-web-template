import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `tag-path.spec.ts` tests the path helper on its own. The item page is a client component
 * that cannot be rendered under `tsx --test`, so these guards read the source: they fail if
 * the sidebar goes back to plain `<a href>` links (which drop the locale) or to a raw tag href.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

describe('item page sidebar links', () => {
	const itemDetail = source('../../../components/item-detail/item-detail.tsx');
	const tagPage = source('../../../app/[locale]/tags/[tag]/page.tsx');

	it('uses the locale-aware Link, not a plain anchor', () => {
		assert.ok(itemDetail.includes("import { Link } from '@/i18n/navigation';"), 'Link is not imported');
		assert.ok(
			!/<a (?:[^>]*\s)?href=\{`\/(?:categories|tags)\//.test(itemDetail),
			'a plain <a> links to a taxonomy page'
		);
		assert.ok(itemDetail.includes('<Link key={index} href={tag.href}'), 'tag links are not <Link>s');
		assert.ok(
			itemDetail.includes('<Link href={`/categories/${encodedCategory}`}'),
			'the category link is not a <Link>'
		);
	});

	it('builds tag hrefs with tagPath, never from the raw tag text', () => {
		assert.ok(itemDetail.includes('const href = tagPath(tag);'), 'tag hrefs do not come from tagPath');
		assert.ok(!itemDetail.includes('`/tags/${tag}`'), 'a raw tag is put in the URL');
	});

	it('the single-tag page looks its segment up with findTagByParam and never decodes it blindly', () => {
		assert.equal(tagPage.split('findTagByParam(tags, tag)').length - 1, 2, 'metadata and page must both use it');
		assert.ok(!tagPage.includes('decodeURIComponent('), 'decodeURIComponent throws on malformed percent-encoding');
		assert.ok(!tagPage.includes('findTagBySegment('), 'a decoded-only lookup misses a literal tag such as `a%20b`');
	});
});
