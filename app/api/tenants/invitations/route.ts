import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTenantId } from '@/lib/db/tenant';
import { createInvitation, getPendingInvitations, cancelInvitation } from '@/lib/services/tenant.service';
import { z } from 'zod';

const createInvitationSchema = z.object({
	email: z.string().email(),
	roleId: z.string().optional()
});

/**
 * GET /api/tenants/invitations
 * Get all pending invitations for the current tenant
 */
export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = await getTenantId();

		const invitations = await getPendingInvitations(tenantId);

		return NextResponse.json({ invitations });
	} catch (error) {
		console.error('[Invitations API] Error fetching invitations:', error);
		return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
	}
}

/**
 * POST /api/tenants/invitations
 * Create a new invitation to join the tenant
 */
export async function POST(request: Request) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		const body = await request.json();

		// Validate request body
		const validationResult = createInvitationSchema.safeParse(body);
		if (!validationResult.success) {
			return NextResponse.json(
				{ error: 'Invalid request', details: validationResult.error.flatten() },
				{ status: 400 }
			);
		}

		const { email, roleId } = validationResult.data;

		const invitation = await createInvitation({
			tenantId,
			email,
			invitedBy: session.user.id,
			roleId
		});

		return NextResponse.json({
			success: true,
			invitation: {
				id: invitation.id,
				email: invitation.email,
				expiresAt: invitation.expiresAt
			}
		});
	} catch (error) {
		console.error('[Invitations API] Error creating invitation:', error);
		const message = error instanceof Error ? error.message : 'Failed to create invitation';
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

/**
 * DELETE /api/tenants/invitations
 * Cancel a pending invitation
 */
export async function DELETE(request: Request) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		const { searchParams } = new URL(request.url);
		const invitationId = searchParams.get('id');

		if (!invitationId) {
			return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
		}

		await cancelInvitation(invitationId, tenantId);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('[Invitations API] Error cancelling invitation:', error);
		return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
	}
}
