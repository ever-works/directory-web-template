import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMutex } from '../mutex';
import { findItemBySourceUrl } from '../source-url';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Two submissions of the same link used to both pass the duplicate check before
 * either one was saved.
 */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

type Row = { slug: string; source_url: string; status: string };

async function submit(store: Row[], slug: string, url: string, run?: ReturnType<typeof createMutex>) {
	const body = async () => {
		await tick(); // reading the item list
		if (findItemBySourceUrl(store, url)) return 'duplicate';
		await tick(); // saving the item
		store.push({ slug, source_url: url, status: 'pending' });
		return 'created';
	};
	return run ? run(body) : body();
}

describe('createMutex', () => {
	it('without it, concurrent check-then-save both pass (the bug)', async () => {
		const store: Row[] = [];
		const results = await Promise.all([
			submit(store, 'a', 'https://example.com/tool'),
			submit(store, 'b', 'https://www.example.com/tool/')
		]);
		assert.deepEqual(results, ['created', 'created']);
		assert.equal(store.length, 2);
	});

	it('with it, one of two concurrent submissions of the same link wins', async () => {
		const store: Row[] = [];
		const run = createMutex();
		const results = await Promise.all([
			submit(store, 'a', 'https://example.com/tool', run),
			submit(store, 'b', 'https://www.example.com/tool/', run)
		]);
		assert.deepEqual(results, ['created', 'duplicate']);
		assert.equal(store.length, 1);
	});

	it('still lets concurrent submissions of different links all succeed', async () => {
		const store: Row[] = [];
		const run = createMutex();
		const results = await Promise.all([
			submit(store, 'a', 'https://one.dev/', run),
			submit(store, 'b', 'https://two.dev/', run),
			submit(store, 'c', 'https://three.dev/', run)
		]);
		assert.deepEqual(results, ['created', 'created', 'created']);
		assert.equal(store.length, 3);
	});

	it('keeps going after a callback throws, and reports the error to its own caller only', async () => {
		const run = createMutex();
		const failing = run(async () => {
			throw new Error('boom');
		});
		const next = run(async () => 'ok');
		await assert.rejects(failing, /boom/);
		assert.equal(await next, 'ok');
	});

	it('runs callbacks one at a time, in call order', async () => {
		const run = createMutex();
		const log: string[] = [];
		await Promise.all(
			['1', '2', '3'].map((n) =>
				run(async () => {
					log.push(`start ${n}`);
					await tick();
					log.push(`end ${n}`);
				})
			)
		);
		assert.deepEqual(log, ['start 1', 'end 1', 'start 2', 'end 2', 'start 3', 'end 3']);
	});
});
