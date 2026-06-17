import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { sessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * @swagger
 * /api/auth/security/sessions/{token}:
 *   delete:
 *     tags: ["Authentication"]
 *     summary: "Revoke a single session"
 *     description: "Deletes one session by its full token. The current session cannot be revoked."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "Session revoked"
 *       400:
 *         description: "Cannot revoke current session"
 *       401:
 *         description: "Unauthorized"
 *       404:
 *         description: "Session not found"
 */
export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ token: string }> }
) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
		}

		const { token } = await params;

		const cookieStore = await cookies();
		const currentToken =
			cookieStore.get('authjs.session-token')?.value ??
			cookieStore.get('next-auth.session-token')?.value ??
			'';

		if (token === currentToken) {
			return NextResponse.json(
				{ success: false, error: 'Cannot revoke your current session from here. Use sign out instead.' },
				{ status: 400 }
			);
		}

		const result = await db
			.delete(sessions)
			.where(
				and(
					eq(sessions.sessionToken, token),
					eq(sessions.userId, session.user.id)
				)
			)
			.returning({ sessionToken: sessions.sessionToken });

		if (result.length === 0) {
			return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
		}

		return NextResponse.json({ success: true, message: 'Session revoked.' });
	} catch (error) {
		console.error('Revoke session error:', error);
		return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
	}
}
