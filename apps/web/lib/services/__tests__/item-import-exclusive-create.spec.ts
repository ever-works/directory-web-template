import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import Module from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { ItemRepository as ItemRepositoryType } from '@/lib/repositories/item.repository';
import type { ItemGitService as ItemGitServiceType } from '@/lib/services/item-git.service';
import type { ItemImportService as ItemImportServiceType } from '@/lib/services/item-import.service';
import type { ImportRowValidation } from '@/lib/types/item-import-export';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * executeImport looks duplicates up once, then writes. Two overlapping imports (or an import and a
 * single submission) can both find a slug free; the later write used to replace the first item's
 * YAML, submitter included, while both requests reported success. The create path now writes with
 * `wx`: an existing file fails with EEXIST, batchCreate leaves that row out and executeImport counts
 * it as skipped. See T-2527.
 *
 * The real ItemGitService writes into a temporary content directory; git commit/push is replaced
 * by a counter, and the audit service (database) by a no-op.
 */
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (request === 'server-only') return {};
	if (request === '@/lib/services/item-audit.service') {
		return { itemAuditService: { logCreation: async () => undefined, logUpdate: async () => undefined } };
	}
	return originalLoad.call(this, request, ...rest);
};
const { ItemGitService } = require('../item-git.service') as { ItemGitService: typeof ItemGitServiceType };
const { ItemRepository } = require('../../repositories/item.repository') as {
	ItemRepository: typeof ItemRepositoryType;
};
const { ItemImportService } = require('../item-import.service') as {
	ItemImportService: typeof ItemImportServiceType;
};
loader._load = originalLoad;

const EXISTING_YAML = [
	'name: Taken Tool',
	'description: An item that already exists in the directory.',
	'source_url: https://taken.example.com',
	'category: [tools]',
	'status: approved',
	'submitted_by: owner-user',
	''
].join('\n');

let dir: string;
let git: ItemGitServiceType;
let commits: number;

function itemFile(slug: string) {
	return path.join(dir, 'data', slug, `${slug}.yml`);
}

function repositoryWith(service: ItemGitServiceType): ItemRepositoryType {
	const repository = new ItemRepository();
	(repository as unknown as { gitService: ItemGitServiceType }).gitService = service;
	return repository;
}

function createRequest(slug: string, submittedBy: string) {
	return {
		id: slug,
		slug,
		name: 'New Tool',
		description: 'A brand new tool for the directory.',
		source_url: `https://${submittedBy}.example.com`,
		category: ['tools'],
		tags: [],
		status: 'pending' as const,
		submitted_by: submittedBy
	};
}

function row(slug: string, sourceUrl: string): ImportRowValidation {
	return {
		rowIndex: 0,
		valid: true,
		errors: [],
		warnings: [],
		data: {
			name: 'New Tool',
			description: 'A brand new tool for the directory.',
			source_url: sourceUrl,
			slug,
			category: ['tools'],
			tags: []
		}
	} as ImportRowValidation;
}

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'item-import-exclusive-'));
	fs.mkdirSync(path.join(dir, 'data', 'taken'), { recursive: true });
	fs.writeFileSync(itemFile('taken'), EXISTING_YAML);
	git = new ItemGitService({ owner: 'o', repo: 'r', token: '', branch: 'main', dataDir: dir, itemsDir: 'data' });
	commits = 0;
	(git as unknown as { commitAndPushBatch: () => Promise<void> }).commitAndPushBatch = async () => {
		commits++;
	};
});

afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

describe('import never replaces an existing item file (T-2527)', () => {
	it('createItemWithoutCommit fails with EEXIST and leaves the existing file alone', async () => {
		await assert.rejects(git.createItemWithoutCommit(createRequest('taken', 'attacker')), { code: 'EEXIST' });

		assert.equal(fs.readFileSync(itemFile('taken'), 'utf8'), EXISTING_YAML);
	});

	it('batchCreate leaves out a row whose file exists and still writes and commits the rest', async () => {
		const created = await repositoryWith(git).batchCreate(
			[createRequest('taken', 'attacker'), createRequest('fresh-tool', 'attacker')],
			'Import 2 items'
		);

		assert.deepEqual(
			created.map((item) => item.slug),
			['fresh-tool']
		);
		assert.equal(fs.readFileSync(itemFile('taken'), 'utf8'), EXISTING_YAML);
		assert.ok(fs.existsSync(itemFile('fresh-tool')));
		assert.equal(commits, 1);
	});

	it('batchCreate does not commit when every row already exists', async () => {
		const created = await repositoryWith(git).batchCreate([createRequest('taken', 'attacker')], 'Import 1 item');

		assert.deepEqual(created, []);
		assert.equal(commits, 0);
	});

	it('of two overlapping imports of the same new slug, the later one is skipped, not written over the first', async () => {
		let releaseLookup!: () => void;
		const lookupHeld = new Promise<void>((resolve) => (releaseLookup = resolve));
		const slowRepository = repositoryWith(git);
		const findAll = slowRepository.findAll.bind(slowRepository);
		slowRepository.findAll = async (options) => {
			const items = await findAll(options);
			await lookupHeld;
			return items;
		};
		const clientOptions = {
			duplicateStrategy: 'skip' as const,
			defaultStatus: 'pending' as const,
			clientMode: true
		};

		// The slow import has looked the slug up (free) but not written yet when the other one writes it.
		const slow = new ItemImportService(slowRepository).executeImport([row('fresh', 'https://slow.example.com')], {
			...clientOptions,
			submittedBy: 'slow-user'
		});
		await new Promise((resolve) => setTimeout(resolve, 20));
		const fast = await new ItemImportService(repositoryWith(git)).executeImport(
			[row('fresh', 'https://fast.example.com')],
			{ ...clientOptions, submittedBy: 'fast-user' }
		);
		releaseLookup();
		const slowResult = await slow;

		assert.equal(fast.created, 1);
		assert.equal(slowResult.created, 0);
		assert.equal(slowResult.skipped, 1);
		assert.match(fs.readFileSync(itemFile('fresh'), 'utf8'), /submitted_by: fast-user/);
	});
});
