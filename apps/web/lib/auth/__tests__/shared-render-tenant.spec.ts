import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { pickSharedRenderTenant, tenantInsertChangesSharedRender } from '../shared-render-tenant';

/**
 * Spec 061: cached item pages embed comments only for an unambiguous tenant.
 *
 * Run with: `npx tsx --test apps/web/lib/auth/__tests__/shared-render-tenant.spec.ts`
 */
describe('pickSharedRenderTenant', () => {
	it('returns the only tenant when it is active', () => {
		assert.equal(pickSharedRenderTenant([{ id: 'default', status: 'active' }]), 'default');
	});

	it('returns null for a single inactive tenant', () => {
		assert.equal(pickSharedRenderTenant([{ id: 'default', status: 'inactive' }]), null);
	});

	it('returns null when there is no tenant', () => {
		assert.equal(pickSharedRenderTenant([]), null);
	});

	it('returns null when several tenants exist, active or not', () => {
		// A host may map to either of them (getTenantId() matches domain/slug without a
		// status filter), so no shared output may carry one tenant's data.
		assert.equal(
			pickSharedRenderTenant([
				{ id: 'a', status: 'active' },
				{ id: 'b', status: 'inactive' }
			]),
			null
		);
		assert.equal(
			pickSharedRenderTenant([
				{ id: 'a', status: 'active' },
				{ id: 'b', status: 'active' }
			]),
			null
		);
	});
});

describe('tenantInsertChangesSharedRender', () => {
	it('is true only for the step from one tenant to two', () => {
		assert.equal(tenantInsertChangesSharedRender(2, undefined), true);
		assert.equal(tenantInsertChangesSharedRender(1, undefined), false);
		assert.equal(tenantInsertChangesSharedRender(3, undefined), false);
	});

	it('is false when TENANT_ID pins the shared-render tenant', () => {
		assert.equal(tenantInsertChangesSharedRender(2, 'default'), false);
		assert.equal(tenantInsertChangesSharedRender(2, ''), true);
	});

	it('is wired into ensureTenantExists: after a real insert, before revalidating item pages', () => {
		const source = readFileSync(join(__dirname, '../tenant.ts'), 'utf8').replace(/\s+/g, ' ');
		assert.ok(source.includes('.onConflictDoNothing().returning({ id: tenant.id });'));
		assert.ok(source.includes('if (inserted.length > 0 && !process.env.TENANT_ID) {'));
		assert.ok(
			source.includes(
				"if (tenantInsertChangesSharedRender(rows.length, process.env.TENANT_ID)) { const { revalidateItemPages } = await import('@/lib/cache-invalidation'); revalidateItemPages(); }"
			)
		);
	});
});
