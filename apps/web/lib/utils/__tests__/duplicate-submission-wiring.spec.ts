import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `source-url.spec.ts` and `mutex.spec.ts` test the helpers on their own, so they stay
 * green if the submit path stops calling them. The repository imports `server-only` and
 * cannot be loaded under `tsx --test`, so these guards read the source instead.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

describe('duplicate submission guard wiring (spec 058)', () => {
	const repository = source('../../repositories/client-item.repository.ts');
	const route = source('../../../app/api/client/items/route.ts');

	it('createAsClient runs the checks and the save inside the submission lock', () => {
		assert.ok(
			repository.includes('const runSubmissionExclusively = createMutex();'),
			'the submission lock is not created'
		);
		assert.ok(
			repository.includes('return runSubmissionExclusively(() => this.createAsClientUnlocked(userId, data));'),
			'createAsClient does not run inside the submission lock'
		);
	});

	it('looks for the link before saving and throws DuplicateSourceUrlError on a match', () => {
		const start = repository.indexOf('private async createAsClientUnlocked(');
		const check = repository.indexOf(
			'const duplicate = findItemBySourceUrl(await this.itemRepository.findAll(), data.source_url);'
		);
		const save = repository.indexOf('const item = await this.itemRepository.create(createRequest);');
		assert.ok(start > 0, 'createAsClientUnlocked not found');
		assert.ok(check > start, 'createAsClientUnlocked does not look for an item with the same link');
		assert.ok(save > check, 'the link check does not run before the save');
		assert.ok(
			repository.includes(
				"throw new DuplicateSourceUrlError(duplicate.status === 'approved' ? duplicate.slug : undefined);"
			),
			'a match does not throw DuplicateSourceUrlError, or it reveals the slug of a pending item'
		);
	});

	it('POST /api/client/items answers 409 for DuplicateSourceUrlError', () => {
		const create = route.indexOf('await clientItemRepository.createAsClient(userId, createData);');
		const caught = route.indexOf('if (error instanceof DuplicateSourceUrlError) {');
		const conflict = route.indexOf('{ status: 409 }', caught);
		const fallback = route.indexOf("return serverErrorResponse(error, 'Failed to create item');");
		assert.ok(create > 0, 'the route does not call createAsClient');
		assert.ok(caught > create, 'the route does not catch DuplicateSourceUrlError');
		assert.ok(conflict > caught && conflict < fallback, 'DuplicateSourceUrlError is not answered with 409');
	});
});
