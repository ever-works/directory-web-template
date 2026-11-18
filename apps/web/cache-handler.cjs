// @ts-check
/**
 * Cache handler for ISR pages and the data cache (Spec 061): Next.js's own
 * handler, without disk writes.
 *
 * Public pages are cached (ISR). A directory with 4,000 items in 21 locales has
 * ~86,000 cacheable pages; written to disk (Next's default) they grow a pod's
 * filesystem by tens of GB under crawler traffic. Here they stay in Next's
 * memory LRU, bounded by `cacheMaxMemorySize` (`NEXT_CACHE_MAX_MEMORY_MB`).
 * `NEXT_ISR_FLUSH_TO_DISK=true` (read at server start) writes them to disk again.
 *
 * Not `experimental.isrFlushToDisk: false`: that flag also turns off the image
 * optimizer's disk cache, so every `/_next/image` request would optimize its
 * image again. The flag keeps Next's default; only this handler skips the disk.
 *
 * JavaScript, not TypeScript: Next loads this file with a native `import()` at
 * run time, outside the bundler. It extends an internal Next.js class; when
 * upgrading Next, `lib/__tests__/page-cache-handler.spec.ts` fails if it moves.
 */
const FileSystemCache = require('next/dist/server/lib/incremental-cache/file-system-cache').default;

/** Next refuses data-cache entries over 2 MB with its own handler, not with a custom one: keep that limit. */
const MAX_DATA_CACHE_ENTRY_CHARS = 2 * 1024 * 1024;

class PageMemoryCache extends FileSystemCache {
	/** @param {ConstructorParameters<typeof FileSystemCache>[0]} ctx */
	constructor(ctx) {
		super({ ...ctx, flushToDisk: Boolean(ctx.flushToDisk) && process.env.NEXT_ISR_FLUSH_TO_DISK === 'true' });
	}

	/** @type {FileSystemCache['set']} */
	async set(key, data, ctx) {
		if (
			ctx &&
			'fetchCache' in ctx &&
			ctx.fetchCache &&
			!ctx.isImplicitBuildTimeCache &&
			JSON.stringify(data).length > MAX_DATA_CACHE_ENTRY_CHARS
		) {
			console.warn(`Failed to set Next.js data cache for ${ctx.fetchUrl || key}, items over 2MB can not be cached`);
			return;
		}
		return super.set(key, data, ctx);
	}
}

module.exports = PageMemoryCache;
