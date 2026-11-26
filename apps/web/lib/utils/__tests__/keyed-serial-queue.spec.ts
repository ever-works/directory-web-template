import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createKeyedSerialQueue } from '../keyed-serial-queue';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `LocationIndexService.indexItem` and `removeFromIndex` run through this queue per item slug
 * (T-2840). `reviewItem` starts the index write without awaiting it, so before the queue an
 * approval whose geocode was slow could upsert the row after a later rejection had removed it, and
 * the rejected item's location was public again until the next rebuild.
 */

function deferred<T = void>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('createKeyedSerialQueue', () => {
	it('runs a later task for the same key only after the earlier one has finished', async () => {
		const queue = createKeyedSerialQueue();
		const events: string[] = [];
		const slowGeocode = deferred();

		const approval = queue.run('item-a', async () => {
			events.push('approval started');
			await slowGeocode.promise;
			events.push('approval upserted');
			return 'indexed';
		});
		const rejection = queue.run('item-a', async () => {
			events.push('rejection removed');
			return 'removed';
		});

		await Promise.resolve();
		await Promise.resolve();
		assert.deepEqual(events, ['approval started'], 'the rejection ran before the approval finished');

		slowGeocode.resolve();
		assert.equal(await approval, 'indexed');
		assert.equal(await rejection, 'removed');
		assert.deepEqual(events, ['approval started', 'approval upserted', 'rejection removed']);
	});

	it('does not hold back a task for another key', async () => {
		const queue = createKeyedSerialQueue();
		const blocker = deferred();
		const blocked = queue.run('item-a', () => blocker.promise);
		const other = await queue.run('item-b', async () => 'other done');
		assert.equal(other, 'other done');
		blocker.resolve();
		await blocked;
	});

	it('runs the next task when the earlier one failed, and passes each result or error to its own caller', async () => {
		const queue = createKeyedSerialQueue();
		const failing = queue.run('item-a', async () => {
			throw new Error('database down');
		});
		const next = queue.run('item-a', async () => 'ran');
		await assert.rejects(failing, /database down/);
		assert.equal(await next, 'ran');
	});

	it('forgets a key once its last task has settled', async () => {
		const queue = createKeyedSerialQueue();
		const gate = deferred();
		const first = queue.run('item-a', () => gate.promise);
		const second = queue.run('item-a', async () => undefined);
		assert.equal(queue.size, 1);
		gate.resolve();
		await first;
		await second;
		await Promise.resolve();
		assert.equal(queue.size, 0);
	});
});
