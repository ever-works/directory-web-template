/**
 * Spec 027 — GET /api/client/notifications/stream
 *
 * Server-Sent Events stream that pushes fresh `notification` events to
 * the authenticated client. Single endpoint, no buffering — the DB
 * row is the canonical record; the SSE channel is just a fan-out.
 *
 * Note: this route runs in the Node.js runtime because the in-memory
 * pub/sub relies on a shared `EventEmitter` (per-process). On Vercel
 * Serverless functions the connection lives for the function timeout;
 * on long-running deployments it stays open until the client closes or
 * the session ends: every 25 s ping re-reads the user's password version
 * and deactivation state and closes the stream once a password reset or
 * change (spec-003 AC-9) or a deactivation has ended the session it opened
 * with (lib/notifications/stream.ts).
 */

import { auth } from '@/lib/auth';
import { passwordVersionOf } from '@/lib/auth/password-change';
import { getUserSessionState } from '@/lib/db/queries/user.queries';
import { notificationPubSub } from '@/lib/notifications/pubsub';
import {
	createNotificationStream,
	notificationStreamSessionHolds,
	type NotificationStreamSession
} from '@/lib/notifications/stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return new Response('Unauthorized', { status: 401 });
	}
	const userId = session.user.id;

	// The state the pings compare against. auth() is run again after this read: a reset or change
	// that committed after auth() read the user and before this read would be in `opened` and never
	// end the stream, but the second auth() sees it and ends the session. The deactivation claim
	// comes from the first auth(), so a deactivation in between still ends the stream.
	let opened: NotificationStreamSession;
	try {
		const state = await getUserSessionState(userId);
		opened = {
			passwordVersion: passwordVersionOf(state?.passwordChangedAt),
			deactivated: session.user.isDeactivated === true,
			deactivatedAt: state?.deactivatedAt ? state.deactivatedAt.getTime() : null
		};
	} catch {
		return new Response('Service Unavailable', { status: 503 });
	}
	const confirmed = await auth();
	if (confirmed?.user?.id !== userId) {
		return new Response('Unauthorized', { status: 401 });
	}

	const stream = createNotificationStream({
		userId,
		signal: req.signal,
		subscribe: (id, listener) => notificationPubSub.subscribe(id, listener),
		sessionStillHolds: async () => notificationStreamSessionHolds(opened, await getUserSessionState(userId))
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
}
