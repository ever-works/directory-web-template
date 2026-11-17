import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { ItemFileCache } from '../item-file-cache';

/**
 * Spec 061: the parsed base item YAML is shared by every locale and only
 * re-parsed when the file changes.
 *
 * Run with: `npx tsx --test apps/web/lib/__tests__/item-file-cache.spec.ts`
 */

type Parsed = { slug: string; raw: string };

let root: string;
let dest: string;
let parsedFiles: string[];
let parsedTranslations: string[];

function makeCache(now?: () => number) {
	return new ItemFileCache<Parsed>({
		parseItem: async (dir, filename, slug) => {
			parsedFiles.push(path.join(path.basename(dir), filename));
			const raw = await fs.readFile(path.join(dir, filename), 'utf8');
			return raw.startsWith('broken') ? null : { slug, raw };
		},
		parseTranslation: async (dir, filename) => {
			parsedTranslations.push(filename);
			return { name: (await fs.readFile(path.join(dir, filename), 'utf8')).trim() };
		},
		sanitizeSlug: (name) => {
			if (name.includes('..')) throw new Error('bad slug');
			return path.basename(name);
		},
		assertInside: (filePath, basePath) => {
			const resolved = path.resolve(filePath);
			if (!resolved.startsWith(path.resolve(basePath) + path.sep)) throw new Error('outside');
		},
		concurrency: 4,
		now
	});
}

async function writeItem(slug: string, files: Record<string, string>) {
	const dir = path.join(dest, slug);
	await fs.mkdir(dir, { recursive: true });
	for (const [name, content] of Object.entries(files)) {
		await fs.writeFile(path.join(dir, name), content);
	}
}

async function dirMtime() {
	return (await fs.stat(dest)).mtimeMs;
}

beforeEach(async () => {
	root = await fs.mkdtemp(path.join(os.tmpdir(), 'item-file-cache-'));
	dest = path.join(root, 'data');
	await fs.mkdir(dest);
	parsedFiles = [];
	parsedTranslations = [];
});

afterEach(async () => {
	await fs.rm(root, { recursive: true, force: true });
});

describe('ItemFileCache', () => {
	it('parses each base file once and reuses the snapshot for every caller', async () => {
		await writeItem('alpha', { 'alpha.yml': 'name: Alpha' });
		await writeItem('beta', { 'beta.yml': 'name: Beta' });
		const cache = makeCache();
		const options = { dirMtimeMs: await dirMtime(), maxAgeMs: 60_000, reuse: true };

		const first = await cache.getSnapshot(dest, options);
		const second = await cache.getSnapshot(dest, options);

		assert.equal(first, second);
		assert.deepEqual([...first.slugs].sort(), ['alpha', 'beta']);
		assert.equal(first.entries.get('alpha')?.item?.raw, 'name: Alpha');
		assert.deepEqual(parsedFiles.sort(), [path.join('alpha', 'alpha.yml'), path.join('beta', 'beta.yml')]);
	});

	it('shares one walk between concurrent callers', async () => {
		await writeItem('alpha', { 'alpha.yml': 'name: Alpha' });
		const cache = makeCache();
		const options = { dirMtimeMs: await dirMtime(), maxAgeMs: 60_000, reuse: true };

		const [a, b, c] = await Promise.all([
			cache.getSnapshot(dest, options),
			cache.getSnapshot(dest, options),
			cache.getSnapshot(dest, options)
		]);

		assert.equal(a, b);
		assert.equal(b, c);
		assert.equal(parsedFiles.length, 1);
	});

	it('after invalidate() walks again but only re-parses files that changed', async () => {
		await writeItem('alpha', { 'alpha.yml': 'name: Alpha' });
		await writeItem('beta', { 'beta.yml': 'name: Beta' });
		const cache = makeCache();
		const options = { dirMtimeMs: await dirMtime(), maxAgeMs: 60_000, reuse: true };
		await cache.getSnapshot(dest, options);
		parsedFiles = [];

		await fs.writeFile(path.join(dest, 'beta', 'beta.yml'), 'name: Beta two');
		cache.invalidate();
		const next = await cache.getSnapshot(dest, options);

		assert.deepEqual(parsedFiles, [path.join('beta', 'beta.yml')]);
		assert.equal(next.entries.get('beta')?.item?.raw, 'name: Beta two');
		assert.equal(next.entries.get('alpha')?.item?.raw, 'name: Alpha');
	});

	it('rebuilds when the data directory mtime changes or the snapshot is too old', async () => {
		await writeItem('alpha', { 'alpha.yml': 'name: Alpha' });
		let clock = 1_000;
		const cache = makeCache(() => clock);
		const first = await cache.getSnapshot(dest, { dirMtimeMs: 1, maxAgeMs: 100, reuse: true });

		const otherMtime = await cache.getSnapshot(dest, { dirMtimeMs: 2, maxAgeMs: 100, reuse: true });
		assert.notEqual(first, otherMtime);

		clock += 101;
		const expired = await cache.getSnapshot(dest, { dirMtimeMs: 2, maxAgeMs: 100, reuse: true });
		assert.notEqual(otherMtime, expired);
		// Walked three times, parsed once: the file never changed.
		assert.equal(parsedFiles.length, 1);
	});

	it('does not keep a snapshot when reuse is off, but still skips unchanged files', async () => {
		await writeItem('alpha', { 'alpha.yml': 'name: Alpha' });
		const cache = makeCache();
		const options = { dirMtimeMs: await dirMtime(), maxAgeMs: 60_000, reuse: false };

		const first = await cache.getSnapshot(dest, options);
		const second = await cache.getSnapshot(dest, options);

		assert.notEqual(first, second);
		assert.equal(parsedFiles.length, 1);
	});

	it('reports directories without YAML as missing and falls back to another YAML file', async () => {
		await writeItem('empty', {});
		await writeItem('notes-only', { 'README.md': '# hi' });
		await writeItem('renamed', { 'renamed.fr.yml': 'name: FR', 'data.yml': 'name: Renamed' });
		const cache = makeCache();

		const snapshot = await cache.getSnapshot(dest, { dirMtimeMs: await dirMtime(), maxAgeMs: 60_000, reuse: true });

		assert.deepEqual([...snapshot.missing].sort(), ['empty', 'notes-only']);
		assert.equal(snapshot.entries.get('renamed')?.ymlFilename, 'data.yml');
		assert.equal(snapshot.entries.get('renamed')?.item?.raw, 'name: Renamed');
	});

	it('keeps a file that fails to parse as a null item without parsing it again', async () => {
		await writeItem('bad', { 'bad.yml': 'broken: [' });
		const cache = makeCache();
		const options = { dirMtimeMs: await dirMtime(), maxAgeMs: 60_000, reuse: true };

		const first = await cache.getSnapshot(dest, options);
		cache.invalidate();
		await cache.getSnapshot(dest, options);

		assert.equal(first.entries.get('bad')?.item, null);
		assert.equal(parsedFiles.length, 1);
	});

	it('drops items whose directory was removed', async () => {
		await writeItem('alpha', { 'alpha.yml': 'name: Alpha' });
		await writeItem('gone', { 'gone.yml': 'name: Gone' });
		const cache = makeCache();
		await cache.getSnapshot(dest, { dirMtimeMs: await dirMtime(), maxAgeMs: 60_000, reuse: true });

		await fs.rm(path.join(dest, 'gone'), { recursive: true });
		cache.invalidate();
		const next = await cache.getSnapshot(dest, { dirMtimeMs: await dirMtime(), maxAgeMs: 60_000, reuse: true });

		assert.deepEqual(next.slugs, ['alpha']);
		assert.equal(next.entries.has('gone'), false);
	});

	it('reads a translation only when the file exists, and caches it until it changes', async () => {
		await writeItem('alpha', { 'alpha.yml': 'name: Alpha', 'alpha.de.yml': 'Alpha DE' });
		const cache = makeCache();
		const snapshot = await cache.getSnapshot(dest, { dirMtimeMs: await dirMtime(), maxAgeMs: 60_000, reuse: true });
		const entry = snapshot.entries.get('alpha')!;

		assert.equal(await cache.readTranslation(entry, 'fr'), null);
		assert.deepEqual(await cache.readTranslation(entry, 'de'), { name: 'Alpha DE' });
		assert.deepEqual(await cache.readTranslation(entry, 'de'), { name: 'Alpha DE' });
		assert.deepEqual(parsedTranslations, ['alpha.de.yml']);

		await fs.writeFile(path.join(dest, 'alpha', 'alpha.de.yml'), 'Alpha DE v2');
		assert.deepEqual(await cache.readTranslation(entry, 'de'), { name: 'Alpha DE v2' });
		assert.deepEqual(parsedTranslations, ['alpha.de.yml', 'alpha.de.yml']);
	});

	it('picks up a translation file added after the first walk', async () => {
		await writeItem('alpha', { 'alpha.yml': 'name: Alpha' });
		const cache = makeCache();
		const options = { dirMtimeMs: await dirMtime(), maxAgeMs: 60_000, reuse: true };
		const before = await cache.getSnapshot(dest, options);
		assert.equal(await cache.readTranslation(before.entries.get('alpha')!, 'nl'), null);

		await fs.writeFile(path.join(dest, 'alpha', 'alpha.nl.yml'), 'Alpha NL');
		cache.invalidate();
		const after = await cache.getSnapshot(dest, options);

		assert.deepEqual(await cache.readTranslation(after.entries.get('alpha')!, 'nl'), { name: 'Alpha NL' });
		assert.equal(parsedFiles.length, 1);
	});
});
