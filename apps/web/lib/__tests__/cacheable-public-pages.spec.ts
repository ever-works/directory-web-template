import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Spec 061: public pages are cached (ISR) and served from the cache. One
 * request-scoped read (cookies(), headers(), the session, or next-intl reading
 * the locale from the headers) anywhere in the shared tree makes every page
 * render per request again, or answer 500 (DYNAMIC_SERVER_USAGE) once a page
 * is cached. The files involved import Next.js / `server-only`, so these guards
 * read the source, like `lib/seo/__tests__/item-rating-wiring.spec.ts`.
 *
 * Run with: `npx tsx --test apps/web/lib/__tests__/cacheable-public-pages.spec.ts`
 */
const read = (relative: string) => readFileSync(join(__dirname, '../..', relative), 'utf8');
const flat = (relative: string) => read(relative).replace(/\s+/g, ' ');
/** Source without comments (naive, enough for these files), whitespace collapsed. */
const code = (relative: string) =>
	read(relative)
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|[^:])\/\/[^\n]*/g, '$1')
		.replace(/\s+/g, ' ');

describe('cacheable public pages (spec 061)', () => {
	it('the root layout does not read the locale or the request', () => {
		const root = code('app/layout.tsx');
		assert.doesNotMatch(root, /getLocale|next\/headers|cookies\(|headers\(/);
		assert.match(flat('app/layout.tsx'), /export default function RootLayout\(\{ children \}: \{ children: React\.ReactNode \}\) \{ return children; \}/);
	});

	it('the [locale] layout renders the document shell with the route locale', () => {
		const layout = flat('app/[locale]/layout.tsx');
		assert.ok(layout.includes('setRequestLocale(locale);'));
		assert.ok(layout.includes('<DocumentShell locale={locale}>'));
	});

	it('the chat mount reads no session, and cookies only where test overrides are allowed', () => {
		const mount = code('components/ai/AiChatMount.tsx');
		assert.doesNotMatch(mount, /\bauth\(\)/);
		assert.ok(mount.includes('if (aiChatTestOverridesAllowed()) { const cookieStore = await cookies();'));
	});

	it('the item and tag pages are ISR for every slug and set the request locale', () => {
		for (const page of ['app/[locale]/items/[slug]/page.tsx', 'app/[locale]/tags/[tag]/page.tsx']) {
			const source = flat(page);
			assert.ok(source.includes('export async function generateStaticParams() { return []; }'), page);
			assert.ok(source.includes('setRequestLocale(locale);'), page);
			assert.doesNotMatch(source, /export const dynamic = 'force-dynamic'/, page);
		}
	});

	it('the item page reads comments for a tenant resolved without the request', () => {
		const page = flat('app/[locale]/items/[slug]/page.tsx');
		assert.ok(page.includes('await getTenantIdForSharedRender()'));
		assert.doesNotMatch(page, /getCommentsByItemId\(slug\)/);
	});

	it('plain listing URLs are rewritten to the cached twins, filtered ones are not', () => {
		const config = flat('next.config.ts');
		assert.ok(config.includes("destination: '/:locale/discover/1/cached'"));
		assert.ok(config.includes("destination: '/:locale/discover/:page/cached'"));
		assert.ok(config.includes("destination: '/:locale/cached-category/:category/1'"));
		assert.ok(config.includes("const discoverFilters = ['q', 'sort', 'tags', 'categories'].map(query);"));
		// The cached rules must come before the generic `/:path` -> `/:path/discover/1` rule.
		assert.ok(config.indexOf('...cachedListings') < config.indexOf("source: '/:path', destination: '/:path/discover/1'"));
	});

	it('the app-wide navigation provider and listing grid do not call useSearchParams() during render', () => {
		const provider = code('components/providers/navigation-provider.tsx');
		assert.ok(provider.includes('<Suspense fallback={null}> <SearchParamsReporter onChange={setSearch} /> </Suspense>'));
		assert.equal((provider.match(/useSearchParams\(\)/g) ?? []).length, 1, 'only SearchParamsReporter may call it');
		assert.doesNotMatch(code('components/shared-card/index.tsx'), /useSearchParams/);
	});

	it('the runtime page cache stays in memory and bounded unless asked otherwise', () => {
		const config = flat('next.config.ts');
		assert.ok(config.includes("isrFlushToDisk: process.env.NEXT_ISR_FLUSH_TO_DISK === 'true'"));
		assert.ok(config.includes('cacheMaxMemorySize:'));
	});
});
