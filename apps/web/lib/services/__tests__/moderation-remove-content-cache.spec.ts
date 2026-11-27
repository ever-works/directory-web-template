import assert from 'node:assert/strict';
import Module from 'node:module';
import { beforeEach, describe, it } from 'node:test';

import type { ModerationResult } from '@/lib/services/moderation.service';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * An admin who resolves a report as content removed (`PUT /api/admin/reports/[id]` with
 * `resolution: 'content_removed'`) runs `removeContent`, which deletes a reported item from the
 * data repository and cleared no cache. `fetchItems` (`lib/content.ts`) keeps the public listing
 * in memory for 10 minutes whenever NODE_ENV is not development, so the item page answered 404 at
 * once while the listing pages, `GET /api/items/listing` and `GET /api/items/engagement` kept
 * showing the removed item for up to 10 minutes. The item branch now calls
 * `invalidateContentCaches()` right after the delete, as the admin item routes do (T-2865), so
 * the listing is cleared even when the moderation history write after it fails (T-2872).
 *
 * The real service is loaded with the item repository, the moderation and comment queries, the
 * schema constants, the email service and `lib/cache-invalidation` replaced. Each stub write
 * (`delete:<id>`, `history:<id>`, `delete-comment:<id>`) and each `invalidateContentCaches()`
 * call is recorded in `events`, so a test reads their order. The module graph is CommonJS under
 * `tsx --test`, so intercepting `Module._load` is enough.
 */
type RemoveContent = (
	contentType: 'item' | 'comment',
	contentId: string,
	reportId: string,
	adminId: string
) => Promise<ModerationResult>;
type StoredItem = { id: string; slug: string; name: string; submitted_by?: string };

const state = {
	items: new Map<string, StoredItem>(),
	comments: new Map<string, { id: string; userId: string }>(),
	/** Ids whose delete throws, as a failed file write or git operation does. */
	failingDeletes: new Set<string>(),
	/** When set, writing the moderation history row throws. */
	failHistory: false,
	/** Each write and each cache invalidation, in order. */
	events: [] as string[]
};

class StubItemRepository {
	async findById(id: string) {
		return state.items.get(id) ?? null;
	}
	async delete(id: string) {
		if (state.failingDeletes.has(id)) throw new Error(`Git operation failed for ${id}`);
		state.events.push(`delete:${id}`);
		state.items.delete(id);
	}
}

const stubs: Record<string, unknown> = {
	'server-only': {},
	'@/lib/repositories/item.repository': { ItemRepository: StubItemRepository },
	'@/lib/db/queries/moderation.queries': {
		createModerationHistory: async (data: { contentId?: string }) => {
			if (state.failHistory) throw new Error('Database write failed');
			state.events.push(`history:${data.contentId}`);
		},
		incrementWarningCount: async () => ({ warningCount: 1 }),
		suspendUser: async () => undefined,
		banUser: async () => undefined,
		getClientProfileById: async (id: string) => ({ id, email: `${id}@example.com`, status: 'active' }),
		// Only users whose id starts with `user-` have a client profile
		getClientProfileByUserId: async (userId: string) =>
			userId.startsWith('user-') ? { id: `profile-${userId}` } : null
	},
	'@/lib/db/queries/comment.queries': {
		getCommentById: async (id: string) => state.comments.get(id) ?? null,
		deleteComment: async (id: string) => {
			state.events.push(`delete-comment:${id}`);
		}
	},
	'@/lib/db/schema': {
		ModerationAction: { CONTENT_REMOVED: 'content_removed' },
		ReportContentType: { ITEM: 'item', COMMENT: 'comment' }
	},
	'@/lib/services/email-notification.service': {
		EmailNotificationService: { sendContentRemovedEmail: async () => ({ success: true }) }
	},
	'@/lib/cache-invalidation': {
		invalidateContentCaches: async () => {
			state.events.push('invalidate');
			return true;
		}
	}
};

const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return originalLoad.call(this, request, ...rest);
};
const { removeContent } = require('../moderation.service') as { removeContent: RemoveContent };
loader._load = originalLoad;

function seedItem(id: string, submittedBy = 'user-owner') {
	state.items.set(id, { id, slug: id, name: `Item ${id}`, submitted_by: submittedBy });
}

beforeEach(() => {
	state.items.clear();
	state.comments.clear();
	state.failingDeletes.clear();
	state.failHistory = false;
	state.events = [];
});

describe('removeContent clears the content caches after it removes a reported item', () => {
	it('invalidates once, right after the item is deleted', async () => {
		seedItem('reported');
		const result = await removeContent('item', 'reported', 'report-1', 'admin-1');
		assert.equal(result.success, true);
		assert.deepEqual(state.events, ['delete:reported', 'invalidate', 'history:reported']);
	});

	it('invalidates once for an item whose submitter has no client profile', async () => {
		seedItem('imported', 'import');
		const result = await removeContent('item', 'imported', 'report-1', 'admin-1');
		assert.equal(result.success, true);
		assert.deepEqual(state.events, ['delete:imported', 'invalidate']);
	});

	it('has invalidated already when the moderation history write after the delete fails', async () => {
		seedItem('reported');
		state.failHistory = true;
		const result = await removeContent('item', 'reported', 'report-1', 'admin-1');
		assert.equal(result.success, false);
		// The item is gone, so the listing must not keep it
		assert.deepEqual(state.events, ['delete:reported', 'invalidate']);
	});

	it('does not invalidate when the item is not found', async () => {
		const result = await removeContent('item', 'missing', 'report-1', 'admin-1');
		assert.equal(result.success, false);
		assert.equal(result.error, 'NOT_FOUND');
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the delete fails', async () => {
		seedItem('reported');
		state.failingDeletes.add('reported');
		const result = await removeContent('item', 'reported', 'report-1', 'admin-1');
		assert.equal(result.success, false);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when it removes a comment (comments are not on the listing)', async () => {
		state.comments.set('comment-1', { id: 'comment-1', userId: 'profile-commenter' });
		const result = await removeContent('comment', 'comment-1', 'report-1', 'admin-1');
		assert.equal(result.success, true);
		assert.deepEqual(state.events, ['delete-comment:comment-1', 'history:comment-1']);
	});
});
