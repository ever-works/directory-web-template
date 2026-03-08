import { auth } from '@/lib/auth';
import { getTenantById } from '@/lib/db/queries/tenant.queries';
import { NextResponse } from 'next/server';

/**
 * GET /api/tenant
 * Returns the current tenant for the authenticated user.
 */
export async function GET() {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ tenant: null }, { status: 401 });
		}

		const tenantId = session.user.tenantId;

		if (!tenantId) {
			return NextResponse.json({ tenant: null });
		}

		const tenantData = await getTenantById(tenantId);

		return NextResponse.json({ tenant: tenantData });
	} catch (error) {
		console.error('[api/tenant] Error fetching tenant:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
