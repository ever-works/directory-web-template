import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { acceptInvitation } from '@/lib/services/tenant.service';

interface RouteParams {
	params: Promise<{ token: string }>;
}

/**
 * POST /api/tenants/invitations/[token]/accept
 * Accept an invitation using the token
 */
export async function POST(_request: Request, { params }: RouteParams) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json(
				{ error: 'Unauthorized - you must be logged in to accept an invitation' },
				{ status: 401 }
			);
		}

		const { token } = await params;

		if (!token) {
			return NextResponse.json({ error: 'Invitation token required' }, { status: 400 });
		}

		await acceptInvitation(token, session.user.id);

		return NextResponse.json({
			success: true,
			message: 'Successfully joined the organization'
		});
	} catch (error) {
		console.error('[Accept Invitation API] Error:', error);
		const message = error instanceof Error ? error.message : 'Failed to accept invitation';
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
