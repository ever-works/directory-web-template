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
		assert.ok(page.includes('getTenantIdForSharedRender() .catch(() => null)'));
		assert.doesNotMatch(page, /getCommentsByItemId\(slug\)/);
	});

	it('plain listing URLs are rewritten to the cached twins, filtered ones are not', () => {
		const config = flat('next.config.ts');
		assert.ok(config.includes("destination: '/:locale/discover/1/cached'"));
		assert.ok(config.includes("destination: '/:locale/discover/:page/cached'"));
		assert.ok(config.includes("destination: '/:locale/cached-category/:category/1'"));
		assert.ok(config.includes("const discoverFilters = ['q', 'sort', 'tags', 'categories'].map(query);"));
		assert.ok(config.includes("const categoryFilters = ['q', 'sort', 'tags'].map(query);"));
		// Every cached rule must be conditioned on the filter parameters being absent.
		const rules = config.slice(config.indexOf('const cachedListings = ['), config.indexOf('return [ ...mdMirrors'));
		const destinations = rules.match(/destination: '[^']+'/g) ?? [];
		const missing = rules.match(/missing: (discoverFilters|categoryFilters|\[\.\.\.categoryFilters, query\('page'\)\])/g) ?? [];
		assert.equal(destinations.length, 5, 'expected five cached listing rules');
		assert.equal(missing.length, destinations.length, 'a cached rule without its missing filters would cache filtered URLs');
		// Only canonical page numbers go to the twins; /discover/0 or ?page=abc stay dynamic.
		// (next.config.ts holds the regex escaped in a string: `\\d`.)
		assert.ok(config.includes('/discover/:page([1-9]\\\\d{0,5})'));
		assert.ok(config.includes("value: '(?<page>[1-9]\\\\d{0,5})'"));
		// The cached rules must come before the generic `/:path` -> `/:path/discover/1` rule.
		assert.ok(config.indexOf('...cachedListings') < config.indexOf("source: '/:path', destination: '/:path/discover/1'"));
	});

	it('the app-wide navigation provider and listing grid do not call useSearchParams() during render', () => {
		const provider = code('components/providers/navigation-provider.tsx');
		assert.ok(provider.includes('<Suspense fallback={null}> <SearchParamsReporter onChange={setSearch} /> </Suspense>'));
		assert.equal((provider.match(/useSearchParams\(\)/g) ?? []).length, 1, 'only SearchParamsReporter may call it');
		assert.doesNotMatch(code('components/shared-card/index.tsx'), /useSearchParams/);
	});

	it('the proxy answers direct requests for the cached twins with 404', () => {
		const proxy = code('proxy.ts');
		assert.ok(proxy.includes('if (isCachedListingTwinPath(resolveLocalePrefix(originalPathname).pathWithoutLocale)) { return new NextResponse(null, { status: 404 }); }'));
	});

	it('server-side React Query clients schedule no garbage-collection timers', () => {
		// A timer started during a request keeps that request's async context (render
		// streams, RSC payload) alive until it fires: ~1 MB per page for 10 minutes.
		assert.ok(code('lib/query-client.ts').includes('gcTime: isServer ? Infinity : 10 * 60 * 1000,'));
		// Hooks pass their own gcTime (5 min to a day) during SSR: long TanStack timers are
		// not scheduled on the server at all.
		const qc = code('lib/query-client.ts');
		assert.ok(qc.includes('const SERVER_MAX_QUERY_TIMER_MS = 60_000; if (isServer) { timeoutManager.setTimeoutProvider'));
		assert.ok(qc.includes('setTimeout: (callback, delay) => (delay >= SERVER_MAX_QUERY_TIMER_MS ? 0 : setTimeout(callback, delay))'));
	});

	it("lib/content.ts ('use server') exports async functions only", () => {
		// A synchronous export there fails `next build` ("Server Actions must be async functions").
		const content = code('lib/content.ts');
		assert.ok(content.startsWith("'use server';"));
		assert.doesNotMatch(content, /export function |export const \w+ = (?!async)/);
	});

	it('the runtime page cache stays in memory and bounded, and the image cache keeps its disk', () => {
		const config = code('next.config.ts');
		assert.ok(config.includes("cacheHandler: path.join(__dirname, 'cache-handler.cjs'),"));
		assert.ok(config.includes('cacheMaxMemorySize:'));
		// isrFlushToDisk: false would also switch off the optimized-image disk cache.
		assert.doesNotMatch(config, /isrFlushToDisk/);
	});
});
