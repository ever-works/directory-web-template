import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, describe, it } from 'node:test';

/**
 * Spec 061: `cache-handler.cjs` is Next.js's own cache handler without disk writes
 * for pages and data, so `experimental.isrFlushToDisk` keeps its default and the
 * optimized-image disk cache keeps working. It extends an internal Next.js class:
 * these tests fail when an upgrade moves or changes it.
 *
 * Run with: `npx tsx --test apps/web/lib/__tests__/page-cache-handler.spec.ts`
 */
const requireHere = createRequire(__filename);
const PageMemoryCache = requireHere('../../cache-handler.cjs');
const FileSystemCache = requireHere('next/dist/server/lib/incremental-cache/file-system-cache').default;

const context = (flushToDisk: boolean) => ({
	fs: {},
	dev: false,
	flushToDisk,
	serverDistDir: '/nonexistent',
	revalidatedTags: [],
	maxMemoryCacheSize: 0,
	_requestHeaders: {}
});

describe('page cache handler (spec 061)', () => {
	const saved = process.env.NEXT_ISR_FLUSH_TO_DISK;
	afterEach(() => {
		if (saved === undefined) delete process.env.NEXT_ISR_FLUSH_TO_DISK;
		else process.env.NEXT_ISR_FLUSH_TO_DISK = saved;
	});

	it("extends Next's file-system cache handler", () => {
		assert.equal(typeof FileSystemCache, 'function');
		assert.equal(Object.getPrototypeOf(PageMemoryCache), FileSystemCache);
	});

	it('writes nothing to disk unless NEXT_ISR_FLUSH_TO_DISK=true', () => {
		delete process.env.NEXT_ISR_FLUSH_TO_DISK;
		assert.equal(new PageMemoryCache(context(true)).flushToDisk, false);
		process.env.NEXT_ISR_FLUSH_TO_DISK = 'true';
		assert.equal(new PageMemoryCache(context(true)).flushToDisk, true);
		// Next itself asked for no disk writes (minimal mode): still none.
		assert.equal(new PageMemoryCache(context(false)).flushToDisk, false);
	});

	it('refuses data-cache entries over 2 MB, as Next does with its own handler', async () => {
		const stored: string[] = [];
		const originalSet = FileSystemCache.prototype.set;
		const originalWarn = console.warn;
		FileSystemCache.prototype.set = async function (key: string) {
			stored.push(key);
		};
		console.warn = () => {};
		try {
			const cache = new PageMemoryCache(context(false));
			const big = { kind: 'FETCH', data: { body: 'x'.repeat(2 * 1024 * 1024) } };
			await cache.set('big-fetch', big, { fetchCache: true, fetchUrl: 'https://example.test/' });
			await cache.set('build-time-fetch', big, { fetchCache: true, isImplicitBuildTimeCache: true });
			await cache.set('small-fetch', { kind: 'FETCH', data: { body: 'x' } }, { fetchCache: true });
			await cache.set('big-page', big, { cacheControl: { revalidate: 600 } });
		} finally {
			FileSystemCache.prototype.set = originalSet;
			console.warn = originalWarn;
		}
		assert.deepEqual(stored, ['build-time-fetch', 'small-fetch', 'big-page']);
	});
});
