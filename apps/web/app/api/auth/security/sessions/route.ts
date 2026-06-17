import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { sessions } from '@/lib/db/schema';
import { eq, and, ne, gt } from 'drizzle-orm';

/**
 * @swagger
 * /api/auth/security/sessions:
 *   get:
 *     tags: ["Authentication"]
 *     summary: "List active sessions"
 *     description: "Returns all active sessions for the authenticated user. Marks the current session.
 *       When the app uses JWT sessions (no DB rows written), the current session is synthesised
 *       from the NextAuth session data so the card always shows at least one entry."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "List of active sessions"
 *       401:
 *         description: "Unauthorized"
 */
export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const currentToken =
			cookieStore.get('authjs.session-token')?.value ??
			cookieStore.get('next-auth.session-token')?.value ??
			'';

		// Query DB sessions (populated only when using database strategy or OAuth flows)
		const rows = await db
			.select({
				sessionToken: sessions.sessionToken,
				expires: sessions.expires,
			})
			.from(sessions)
			.where(
				and(
					eq(sessions.userId, session.user.id),
					gt(sessions.expires, new Date())
				)
			)
			.orderBy(sessions.expires);

		const data = rows.map((row) => ({
			token: row.sessionToken.slice(-8),
			tokenFull: row.sessionToken,
			expires: row.expires instanceof Date ? row.expires.toISOString() : String(row.expires),
			isCurrent: row.sessionToken === currentToken,
		}));

		// With JWT strategy the sessions table stays empty. Synthesise the current
		// session from the NextAuth session so the UI always shows at least one entry.
		const currentInDb = data.some((s) => s.isCurrent);
		if (!currentInDb && session.expires) {
			const syntheticToken = currentToken || `jwt-${session.user.id}`;
			data.unshift({
				token: syntheticToken.slice(-8),
				tokenFull: syntheticToken,
				expires: new Date(session.expires).toISOString(),
				isCurrent: true,
			});
		}

		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error('Sessions list error:', error);
		return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/auth/security/sessions:
 *   delete:
 *     tags: ["Authentication"]
 *     summary: "Revoke all other sessions"
 *     description: "Deletes all DB sessions for the user except the current one."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Sessions revoked"
 *       401:
 *         description: "Unauthorized"
 */
export async function DELETE() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const currentToken =
			cookieStore.get('authjs.session-token')?.value ??
			cookieStore.get('next-auth.session-token')?.value ??
			'';

		// Delete all DB sessions that aren't the current one
		if (currentToken) {
			await db
				.delete(sessions)
				.where(
					and(
						eq(sessions.userId, session.user.id),
						ne(sessions.sessionToken, currentToken)
					)
				);
		} else {
			await db.delete(sessions).where(eq(sessions.userId, session.user.id));
		}

		return NextResponse.json({ success: true, message: 'All other sessions have been revoked.' });
	} catch (error) {
		console.error('Revoke all sessions error:', error);
		return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
	}
}
