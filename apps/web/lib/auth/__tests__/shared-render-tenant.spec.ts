import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pickSharedRenderTenant } from '../shared-render-tenant';

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
