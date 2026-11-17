import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import { join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import type { ItemRepository } from '@/lib/repositories/item.repository';
import type { ItemImportService as ItemImportServiceType } from '@/lib/services/item-import.service';
import type { ImportRowValidation } from '@/lib/types/item-import-export';
import { importRowSchema } from '@/lib/validations/item-import';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * POST /api/client/items/import (any signed-in user) and POST /api/admin/items/import hand the
 * rows the browser sends back to `executeImport`. Those rows carry their own `valid` and
 * `duplicate` flags and their own data, so the service must check them again: a client could
 * otherwise overwrite an existing item's YAML (and become its submitter), write outside `data/`
 * with a slug such as `../x`, or mark its own submission as featured. See T-2527.
 *
 * The real ItemRepository pulls in the Git CMS, so the module is replaced by an empty class
 * while the service loads (the graph is CommonJS under `tsx --test`) and every test passes a
 * fake repository: `findAll` returns one existing item with slug `taken`, and `batchCreate` /
 * `batchUpdate` record what they receive.
 */
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (request === '@/lib/repositories/item.repository') return { ItemRepository: class {} };
	return originalLoad.call(this, request, ...rest);
};
const { ItemImportService } = require('../item-import.service') as {
	ItemImportService: typeof ItemImportServiceType;
};
loader._load = originalLoad;

const TAKEN = {
	id: 'taken',
	slug: 'taken',
	name: 'Taken Tool',
	description: 'An item that already exists in the directory.',
	source_url: 'https://taken.example.com',
	category: ['tools'],
	tags: [],
	featured: false,
	status: 'approved',
	submitted_by: 'owner-user',
	updated_at: '2026-01-01 00:00'
};

class FakeRepository {
	findAllCalls: unknown[] = [];
	created: Array<Record<string, unknown>> = [];
	updated: Array<{ id: string; data: Record<string, unknown> }> = [];

	async findAll(options?: unknown) {
		this.findAllCalls.push(options);
		return [TAKEN];
	}

	async batchCreate(items: Array<Record<string, unknown>>) {
		this.created.push(...items);
		return items;
	}

	async batchUpdate(updates: Array<{ id: string; data: Record<string, unknown> }>) {
		this.updated.push(...updates);
		return updates.map((update) => update.data);
	}
}

let repo: FakeRepository;
let service: ItemImportServiceType;

beforeEach(() => {
	repo = new FakeRepository();
	service = new ItemImportService(repo as unknown as ItemRepository);
});

/** A row as the browser sends it back: validateRows output, flags included. */
function row(rowIndex: number, data: Record<string, unknown>, extra: Partial<ImportRowValidation> = {}) {
	return {
		rowIndex,
		valid: true,
		errors: [],
		warnings: [],
		data: {
			name: 'New Tool',
			description: 'A brand new tool for the directory.',
			source_url: `https://new-${rowIndex}.example.com`,
			slug: `new-tool-${rowIndex}`,
			category: ['tools'],
			tags: ['one'],
			collections: [],
			featured: false,
			images: [],
			status: 'pending',
			...data
		},
		...extra
	} as ImportRowValidation;
}

const clientOptions = {
	duplicateStrategy: 'skip' as const,
	defaultStatus: 'pending' as const,
	submittedBy: 'client-user',
	clientMode: true
};
const adminOptions = { duplicateStrategy: 'skip' as const, defaultStatus: 'draft' as const, submittedBy: 'admin' };

const createdSlugs = () => repo.created.map((item) => item.slug);

describe('executeImport re-checks the rows the browser sends back (T-2527)', () => {
	it('(a) skips a row marked valid whose slug already exists, even without a duplicate flag', async () => {
		const result = await service.executeImport([row(0, { slug: 'taken' })], clientOptions);

		assert.equal(result.created, 0);
		assert.equal(result.skipped, 1);
		assert.ok(!createdSlugs().includes('taken'), 'an existing item must never reach batchCreate');
		assert.deepEqual(repo.updated, []);
	});

	it('(b) reports a path-like slug such as ../x as an error and writes nothing', async () => {
		const result = await service.executeImport([row(3, { slug: '../x' })], clientOptions);

		assert.equal(result.created, 0);
		assert.deepEqual(repo.created, []);
		assert.equal(result.errors.length, 1);
		assert.equal(result.errors[0].rowIndex, 3);
		assert.match(result.errors[0].message, /slug/i);
	});

	it('(c) in client mode, featured:true reaches batchCreate as false', async () => {
		const result = await service.executeImport([row(0, { featured: true })], clientOptions);

		assert.equal(result.created, 1);
		assert.equal(repo.created.length, 1);
		assert.equal(repo.created[0].featured, false);
	});

	it('looks duplicates up among all items, deleted ones included', async () => {
		await service.executeImport([row(0, {})], clientOptions);

		assert.deepEqual(repo.findAllCalls, [{ includeDeleted: true }]);
	});

	it('in client mode, drops collections, brand_logo_url and images', async () => {
		await service.executeImport(
			[
				row(0, {
					collections: ['staff-picks'],
					brand_logo_url: 'https://cdn.example.com/logo.png',
					images: ['https://cdn.example.com/shot.png']
				})
			],
			clientOptions
		);

		assert.equal(repo.created.length, 1);
		assert.deepEqual(repo.created[0].collections, []);
		assert.equal(repo.created[0].brand_logo_url, undefined);
		assert.equal(repo.created[0].images, undefined);
		assert.equal(repo.created[0].status, 'pending');
		assert.equal(repo.created[0].submitted_by, 'client-user');
	});

	it('in client mode, never updates an existing item, even when asked to', async () => {
		const result = await service.executeImport([row(0, { slug: 'taken' })], {
			...clientOptions,
			duplicateStrategy: 'update'
		});

		assert.deepEqual(repo.updated, []);
		assert.deepEqual(repo.created, []);
		assert.equal(result.skipped, 1);
	});

	it('skips a row whose link already exists, even without a duplicate flag', async () => {
		const result = await service.executeImport([row(0, { source_url: TAKEN.source_url })], clientOptions);

		assert.deepEqual(repo.created, []);
		assert.equal(result.skipped, 1);
	});

	it('reports a row marked valid whose name, description or link break the import rules', async () => {
		const result = await service.executeImport(
			[row(0, { name: 'x' }), row(1, { description: 'short' }), row(2, { source_url: 'not a url' })],
			clientOptions
		);

		assert.deepEqual(repo.created, []);
		assert.deepEqual(
			result.errors.map((error) => error.rowIndex),
			[0, 1, 2]
		);
	});

	it('reports a second row with the same slug in one import instead of writing it twice', async () => {
		const result = await service.executeImport(
			[row(0, { slug: 'same' }), row(1, { slug: 'same', source_url: 'https://other.example.com' })],
			clientOptions
		);

		assert.deepEqual(createdSlugs(), ['same']);
		assert.deepEqual(
			result.errors.map((error) => error.rowIndex),
			[1]
		);
	});

	it('derives the slug from the name when the row has none', async () => {
		await service.executeImport([row(0, { slug: undefined, name: 'Fresh Tool' })], clientOptions);

		assert.deepEqual(createdSlugs(), ['fresh-tool']);
	});

	it('still creates a new admin row as sent, featured included', async () => {
		const result = await service.executeImport(
			[row(0, { featured: true, collections: ['staff-picks'] })],
			adminOptions
		);

		assert.equal(result.created, 1);
		assert.equal(repo.created[0].featured, true);
		assert.deepEqual(repo.created[0].collections, ['staff-picks']);
		assert.equal(repo.created[0].status, 'draft');
	});

	it('with the admin update strategy, updates the existing item instead of creating it', async () => {
		const result = await service.executeImport([row(0, { slug: 'taken', name: 'Renamed Tool' })], {
			...adminOptions,
			duplicateStrategy: 'update'
		});

		assert.deepEqual(repo.created, []);
		assert.equal(result.updated, 1);
		assert.equal(repo.updated[0].id, TAKEN.id);
		assert.equal(repo.updated[0].data.name, 'Renamed Tool');
	});
});

describe('validateRows preview agrees with executeImport (T-2527)', () => {
	const raw = (overrides: Record<string, string>) => ({
		name: 'New Tool',
		description: 'A brand new tool for the directory.',
		source_url: 'https://new.example.com',
		category: 'tools',
		...overrides
	});
	const options = { columnMapping: {}, duplicateStrategy: 'skip' as const, defaultStatus: 'pending' as const };

	it('looks duplicates up among all items, deleted ones included', async () => {
		const result = await service.validateRows([raw({ slug: 'taken' })], options);

		assert.deepEqual(repo.findAllCalls, [{ includeDeleted: true }]);
		assert.equal(result.validationResults[0].duplicate?.slug, 'taken');
	});

	it('flags a slug made from the name that the import would refuse', async () => {
		const result = await service.validateRows([raw({ name: 'snake_case_tool' })], options);

		assert.equal(result.validationResults[0].valid, false);
		assert.match(result.validationResults[0].errors.join(' '), /slug/i);
	});
});

describe('importRowSchema slug rule (T-2527)', () => {
	const base = {
		name: 'New Tool',
		description: 'A brand new tool for the directory.',
		source_url: 'https://new.example.com',
		category: 'tools'
	};

	it('rejects a slug that is not lowercase letters and digits joined by single hyphens', () => {
		for (const slug of [
			'../x',
			'a/b',
			'Upper',
			'two--hyphens',
			'-leading',
			'trailing-',
			'under_score',
			' spaced '
		]) {
			assert.equal(importRowSchema.safeParse({ ...base, slug }).success, false, `slug ${JSON.stringify(slug)}`);
		}
	});

	it('accepts a well-formed slug, an empty slug cell or no slug column', () => {
		for (const slug of ['my-tool', 'tool2', 'a-1-b', '', undefined]) {
			assert.equal(importRowSchema.safeParse({ ...base, slug }).success, true, `slug ${JSON.stringify(slug)}`);
		}
	});
});

describe('links are compared as the single submit compares them (T-2610)', () => {
	// POST /api/client/items refuses these with 409 (findItemBySourceUrl / normalizeSourceUrl).
	const variantsOfTaken = [
		'https://www.taken.example.com',
		'https://taken.example.com/',
		'http://Taken.Example.com/#top',
		'https://taken.example.com/?utm_source=newsletter'
	];

	it('executeImport skips a www, trailing-slash, scheme or tracking variant of an existing link', async () => {
		const result = await service.executeImport(
			variantsOfTaken.map((source_url, i) => row(i, { source_url })),
			clientOptions
		);

		assert.deepEqual(createdSlugs(), []);
		assert.equal(result.created, 0);
		assert.equal(result.skipped, variantsOfTaken.length);
		assert.deepEqual(result.errors, []);
	});

	it('executeImport creates one item for two rows with one link and different names', async () => {
		const result = await service.executeImport(
			[
				row(0, { name: 'Tool A', slug: 'tool-a', source_url: 'https://shared.example.com/tool' }),
				row(1, { name: 'Tool B', slug: 'tool-b', source_url: 'https://shared.example.com/tool' }),
				row(2, { name: 'Tool C', slug: 'tool-c', source_url: 'https://www.shared.example.com/tool/' })
			],
			clientOptions
		);

		assert.deepEqual(createdSlugs(), ['tool-a']);
		assert.equal(result.created, 1);
		assert.equal(result.skipped, 2);
	});

	it('executeImport still creates a row whose link is another page of a known site', async () => {
		const result = await service.executeImport(
			[row(0, { source_url: 'https://taken.example.com/pricing' })],
			clientOptions
		);

		assert.equal(result.created, 1);
	});

	it('executeImport reports javascript: and data: links as errors and writes nothing', async () => {
		const result = await service.executeImport(
			[
				row(0, { source_url: 'javascript:alert(1)' }),
				row(1, { source_url: 'data:text/html,<script>alert(1)</script>' })
			],
			adminOptions
		);

		assert.deepEqual(repo.created, []);
		assert.deepEqual(
			result.errors.map((error) => error.rowIndex),
			[0, 1]
		);
	});

	const raw = (overrides: Record<string, string>) => ({
		name: 'New Tool',
		description: 'A brand new tool for the directory.',
		source_url: 'https://new.example.com',
		category: 'tools',
		...overrides
	});
	const options = { columnMapping: {}, duplicateStrategy: 'skip' as const, defaultStatus: 'pending' as const };

	it('validateRows flags a www or trailing-slash variant of an existing link as a duplicate', async () => {
		const result = await service.validateRows(
			[
				raw({ source_url: 'https://www.taken.example.com/' }),
				raw({ name: 'Other Tool', source_url: 'https://taken.example.com/' })
			],
			options
		);

		assert.deepEqual(
			result.validationResults.map((r) => r.duplicate?.source_url),
			['https://www.taken.example.com/', 'https://taken.example.com/']
		);
		assert.equal(result.summary.duplicates, 2);
		assert.match(result.validationResults[0].warnings.join(' '), /skipped/);
	});

	it('validateRows flags a later row whose link an earlier row of the file already has', async () => {
		const result = await service.validateRows(
			[
				raw({ name: 'Tool A', source_url: 'https://shared.example.com/tool' }),
				raw({ name: 'Tool B', source_url: 'https://shared.example.com/tool' }),
				raw({ name: 'Tool C', source_url: 'https://www.shared.example.com/tool/' })
			],
			options
		);

		assert.deepEqual(
			result.validationResults.map((r) => r.duplicate?.source_url),
			[undefined, 'https://shared.example.com/tool', 'https://www.shared.example.com/tool/']
		);
		assert.equal(result.summary.duplicates, 2);
	});

	it('validateRows says "will be skipped" for a link-only duplicate with the update strategy, as executeImport skips it', async () => {
		const result = await service.validateRows([raw({ source_url: 'https://www.taken.example.com' })], {
			...options,
			duplicateStrategy: 'update'
		});

		assert.equal(result.validationResults[0].duplicate?.source_url, 'https://www.taken.example.com');
		assert.match(result.validationResults[0].warnings.join(' '), /will be skipped/);
	});
});

describe('client import route (T-2527)', () => {
	it('runs the import in client mode', () => {
		const route = readFileSync(join(__dirname, '../../../app/api/client/items/import/route.ts'), 'utf8');

		assert.match(route, /executeImport\(body\.rows, \{[^}]*clientMode: true/);
	});
});
