import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTenantId } from '@/lib/db/tenant';
import { getTenantMembers, removeMember } from '@/lib/services/tenant.service';

/**
 * GET /api/tenants/members
 * Get all members of the current tenant
 */
export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		const members = await getTenantMembers(tenantId);

		return NextResponse.json({ members });
	} catch (error) {
		console.error('[Members API] Error fetching members:', error);
		return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
	}
}

/**
 * DELETE /api/tenants/members?userId=xxx
 * Remove a member from the tenant
 */
export async function DELETE(request: Request) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get('userId');

		if (!userId) {
			return NextResponse.json({ error: 'User ID required' }, { status: 400 });
		}

		// Prevent removing yourself
		if (userId === session.user.id) {
			return NextResponse.json({ error: 'Cannot remove yourself from the organization' }, { status: 400 });
		}

		await removeMember(tenantId, userId);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('[Members API] Error removing member:', error);
		const message = error instanceof Error ? error.message : 'Failed to remove member';
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
