import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Locale-independent cache of parsed item YAML files (Spec 061).
 *
 * Every item lives in `<content>/data/<slug>/<slug>.yml`, with optional
 * per-locale overlays `<slug>.<lang>.yml` next to it. The base YAML is the
 * same for every locale, but `fetchItems` used to read and YAML-parse all of
 * them again for every locale and every option set (`{ lang }`,
 * `{ lang, sortTags }`, ...). On a 4,000-item directory with 21 locales that
 * is about 5 s of CPU per locale, redone whenever the per-locale listing cache
 * expires or a content sync clears it.
 *
 * This cache parses each base file once and keeps it until the file's mtime or
 * size changes, so a cleared listing cache costs one `readdir` + one `stat` per
 * item instead of a full re-parse. Translation overlays are cached the same
 * way, keyed by locale. A snapshot of the whole directory is shared by all
 * locales and rebuilt when the data directory changes, when it is older than
 * `maxAgeMs`, or after {@link ItemFileCache.invalidate}.
 *
 * The module is free of Next.js and `server-only` imports so it can be unit
 * tested on its own (`lib/__tests__/item-file-cache.spec.ts`).
 */

export interface ItemFileEntry<T> {
	slug: string;
	/** Absolute path of the item directory. */
	dir: string;
	ymlFilename: string;
	mtimeMs: number;
	size: number;
	/** Parsed base item, or `null` when the YAML could not be parsed. Never hand it out without copying. */
	item: T | null;
	/** Names of the entries in the item directory, used to skip lookups for translations that do not exist. */
	files: ReadonlySet<string>;
	translations: Map<string, { mtimeMs: number; size: number; data: unknown }>;
}

export interface ItemFileSnapshot<T> {
	dest: string;
	/** Every item directory name, in `readdir` order (including the missing and failed ones). */
	slugs: string[];
	entries: Map<string, ItemFileEntry<T>>;
	/** Item directories that have no YAML file at all. */
	missing: string[];
	/** Item directories that failed with an IO error other than "not found". */
	ioErrors: Array<{ slug: string; error: unknown }>;
	dirMtimeMs: number;
	createdAt: number;
}

export interface ItemFileCacheDeps<T> {
	parseItem(dir: string, filename: string, slug: string): Promise<T | null>;
	parseTranslation(dir: string, filename: string): Promise<unknown>;
	/** Returns the safe directory name or throws. */
	sanitizeSlug(name: string): string;
	/** Throws when `filePath` is not inside `basePath`. */
	assertInside(filePath: string, basePath: string): void;
	concurrency: number;
	now?: () => number;
}

export interface SnapshotOptions {
	/** mtime of `dest`, already read by the caller. */
	dirMtimeMs: number;
	maxAgeMs: number;
	/** `false` skips the shared snapshot (development); parsed files are still reused by mtime. */
	reuse: boolean;
}

function hasCode(error: unknown, code: string): boolean {
	return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code;
}

async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
	const results = new Array<R>(items.length);
	let cursor = 0;
	const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
		while (cursor < items.length) {
			const i = cursor++;
			results[i] = await worker(items[i]);
		}
	});
	await Promise.all(runners);
	return results;
}

/** Same rule as the old `resolveItemDataFilename`: `<slug>.yml`, else the first YAML without a locale suffix, else any YAML. */
function pickItemYaml(slug: string, dirents: readonly { name: string; isFile(): boolean }[]): string | null {
	const preferred = `${slug}.yml`;
	if (dirents.some((entry) => entry.name === preferred)) {
		return preferred;
	}
	const yamlFiles = dirents.filter((entry) => entry.isFile() && /\.(ya?ml)$/i.test(entry.name)).map((entry) => entry.name);
	const primary = yamlFiles.find((name) => !path.basename(name, path.extname(name)).includes('.'));
	return primary ?? yamlFiles[0] ?? null;
}

export class ItemFileCache<T> {
	private parsed = new Map<string, ItemFileEntry<T>>();
	private snapshot: ItemFileSnapshot<T> | null = null;
	private inFlight: { dest: string; promise: Promise<ItemFileSnapshot<T>> } | null = null;
	private generation = 0;

	constructor(private readonly deps: ItemFileCacheDeps<T>) {}

	private now(): number {
		return this.deps.now ? this.deps.now() : Date.now();
	}

	/** Drop the shared snapshot. Parsed files stay and are re-validated by mtime/size on the next load. */
	invalidate(): void {
		this.snapshot = null;
		this.inFlight = null;
		this.generation++;
	}

	/** Drop everything, parsed files included. */
	clear(): void {
		this.invalidate();
		this.parsed.clear();
	}

	async getSnapshot(dest: string, options: SnapshotOptions): Promise<ItemFileSnapshot<T>> {
		const current = this.snapshot;
		if (
			options.reuse &&
			current &&
			current.dest === dest &&
			current.dirMtimeMs === options.dirMtimeMs &&
			this.now() - current.createdAt < options.maxAgeMs
		) {
			return current;
		}

		// Single-flight: all locales asking at once share one directory walk.
		if (this.inFlight && this.inFlight.dest === dest) {
			return this.inFlight.promise;
		}

		const generation = this.generation;
		const promise = this.build(dest, options.dirMtimeMs).then((snapshot) => {
			// Keep it only if nobody invalidated the cache while we were walking and the walk was clean.
			if (options.reuse && generation === this.generation && snapshot.ioErrors.length === 0) {
				this.snapshot = snapshot;
			}
			return snapshot;
		});
		const entry = { dest, promise };
		this.inFlight = entry;
		try {
			return await promise;
		} finally {
			if (this.inFlight === entry) {
				this.inFlight = null;
			}
		}
	}

	private async build(dest: string, dirMtimeMs: number): Promise<ItemFileSnapshot<T>> {
		const dirents = await fsp.readdir(dest, { withFileTypes: true });
		const slugs = dirents.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
		const entries = new Map<string, ItemFileEntry<T>>();
		const nextParsed = new Map<string, ItemFileEntry<T>>();
		const missing: string[] = [];
		const ioErrors: Array<{ slug: string; error: unknown }> = [];

		await mapWithConcurrency(slugs, this.deps.concurrency, async (name) => {
			try {
				const slug = this.deps.sanitizeSlug(name);
				const dir = path.join(dest, slug);
				this.deps.assertInside(dir, dest);

				let itemDirents;
				try {
					itemDirents = await fsp.readdir(dir, { withFileTypes: true });
				} catch (error) {
					if (hasCode(error, 'ENOENT')) {
						missing.push(name);
						return;
					}
					throw error;
				}

				const ymlFilename = pickItemYaml(slug, itemDirents);
				if (!ymlFilename) {
					missing.push(name);
					return;
				}

				const ymlPath = path.join(dir, ymlFilename);
				this.deps.assertInside(ymlPath, dir);
				let stat;
				try {
					stat = await fsp.stat(ymlPath);
				} catch (error) {
					if (hasCode(error, 'ENOENT')) {
						// Removed between readdir and stat: skip it like a file that failed to parse.
						return;
					}
					throw error;
				}

				const files = new Set(itemDirents.map((entry) => entry.name));
				const previous = this.parsed.get(dir);
				let entry: ItemFileEntry<T>;
				if (
					previous &&
					previous.ymlFilename === ymlFilename &&
					previous.mtimeMs === stat.mtimeMs &&
					previous.size === stat.size
				) {
					entry = { ...previous, files };
				} else {
					entry = {
						slug,
						dir,
						ymlFilename,
						mtimeMs: stat.mtimeMs,
						size: stat.size,
						item: await this.deps.parseItem(dir, ymlFilename, slug),
						files,
						translations: new Map()
					};
				}
				nextParsed.set(dir, entry);
				entries.set(name, entry);
			} catch (error) {
				ioErrors.push({ slug: name, error });
			}
		});

		// Replace rather than merge so removed items do not stay in memory. Entries that failed
		// with an IO error this time keep their previous parse for the next attempt.
		for (const { slug } of ioErrors) {
			const dir = path.join(dest, slug);
			const previous = this.parsed.get(dir);
			if (previous) nextParsed.set(dir, previous);
		}
		this.parsed = nextParsed;

		return { dest, slugs, entries, missing, ioErrors, dirMtimeMs, createdAt: this.now() };
	}

	/**
	 * Parsed `<slug>.<lang>.yml` overlay for an entry, or `null` when there is none.
	 * The returned object is shared: copy before mutating it.
	 */
	async readTranslation(entry: ItemFileEntry<T>, lang: string): Promise<unknown> {
		const filename = `${entry.slug}.${lang}.yml`;
		if (!entry.files.has(filename)) {
			return null;
		}
		const filePath = path.join(entry.dir, filename);
		this.deps.assertInside(filePath, entry.dir);
		let stat;
		try {
			stat = await fsp.stat(filePath);
		} catch {
			return null;
		}
		const cached = entry.translations.get(lang);
		if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
			return cached.data;
		}
		const data = await this.deps.parseTranslation(entry.dir, filename);
		entry.translations.set(lang, { mtimeMs: stat.mtimeMs, size: stat.size, data });
		return data;
	}
}
