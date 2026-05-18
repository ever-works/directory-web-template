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
 * on long-running deployments it stays open until the client closes.
 */

import { auth } from '@/lib/auth';
import { notificationPubSub } from '@/lib/notifications/pubsub';
import type { NotificationListItem } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 25_000;

export async function GET(req: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return new Response('Unauthorized', { status: 401 });
	}
	const userId = session.user.id;

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			const send = (event: string, data: unknown) => {
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
				} catch {
					// Controller may already be closed (client disconnect race).
				}
			};

			// Initial hello so the client knows the stream is live.
			send('hello', { userId, ts: Date.now() });

			const heartbeat = setInterval(() => send('ping', { t: Date.now() }), HEARTBEAT_MS);

			const unsubscribe = notificationPubSub.subscribe(userId, (n: NotificationListItem) => {
				send('notification', n);
			});

			req.signal.addEventListener('abort', () => {
				clearInterval(heartbeat);
				unsubscribe();
				try {
					controller.close();
				} catch {
					// already closed
				}
			});
		}
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
