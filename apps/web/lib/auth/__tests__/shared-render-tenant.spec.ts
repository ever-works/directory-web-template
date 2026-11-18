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

	it('with TENANT_ID set, returns it only when it is the only tenant', () => {
		assert.equal(pickSharedRenderTenant([{ id: 'acme', status: 'active' }], 'acme'), 'acme');
		assert.equal(pickSharedRenderTenant([{ id: 'default', status: 'active' }], 'acme'), null);
		// TENANT_ID pins anonymous requests only: a signed-in visitor of another tenant
		// resolves to their session's tenant, so other rows make the shared render ambiguous.
		assert.equal(
			pickSharedRenderTenant(
				[
					{ id: 'acme', status: 'active' },
					{ id: 'other', status: 'active' }
				],
				'acme'
			),
			null
		);
		assert.equal(pickSharedRenderTenant([{ id: 'acme', status: 'inactive' }], 'acme'), null);
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
		assert.equal(tenantInsertChangesSharedRender(2), true);
		assert.equal(tenantInsertChangesSharedRender(1), false);
		assert.equal(tenantInsertChangesSharedRender(3), false);
	});

	it('is wired into ensureTenantExists: after a real insert, before revalidating item pages', () => {
		const source = readFileSync(join(__dirname, '../tenant.ts'), 'utf8').replace(/\s+/g, ' ');
		assert.ok(source.includes('.onConflictDoNothing().returning({ id: tenant.id });'));
		// Whether or not TENANT_ID is set: the shared render no longer depends on it alone.
		assert.ok(source.includes('if (inserted.length > 0) {'));
		assert.ok(
			source.includes(
				"if (tenantInsertChangesSharedRender(rows.length)) { const { revalidateItemPages } = await import('@/lib/cache-invalidation'); revalidateItemPages(); }"
			)
		);
	});

	it('getTenantIdForSharedRender passes TENANT_ID to the pick instead of returning it', () => {
		const source = readFileSync(join(__dirname, '../tenant.ts'), 'utf8').replace(/\s+/g, ' ');
		const fn = source.slice(source.indexOf('export async function getTenantIdForSharedRender()'));
		assert.ok(fn.includes('return pickSharedRenderTenant(rows, envTenantId);'));
		assert.doesNotMatch(fn.slice(0, fn.indexOf('pickSharedRenderTenant')), /return (fromEnv|envTenantId)/);
	});
});
