/**
 * EW-120 Activity Feed — push-mode emitter.
 *
 * Fire-and-forget POST to the Ever Works platform's
 * `/api/activity-log/ingest` endpoint when a tracked event happens
 * (user registered, item submitted, report filed, report resolved).
 *
 * Idempotent: each call generates a fresh UUID `eventId`. The platform
 * stores `(workId, eventId)` uniquely so a successful retry of the same
 * payload is a no-op. We pick a fresh UUID per call (not per event) on
 * purpose — duplicate events on different UUIDs would write twice, but
 * the alternative (stable deterministic IDs across retries) needs
 * inputs that vary per event type and would be a foot-gun. The 2-retry
 * window is short enough that we accept the rare dupe risk.
 *
 * Retry policy: 2 retries with 200ms then 800ms backoff. Network errors
 * and 5xx responses are retried; 4xx responses (including 409
 * mode-mismatch when the Work is configured for pull) terminate
 * immediately — retrying won't change the answer.
 *
 * Silent no-op when env vars are missing so OSS self-hosters who aren't
 * using the platform's Activity Feed feature don't get warning spam.
 *
 * Spec: docs/spec/024-ew-120-platform-activity-feed/
 */
import { randomUUID } from 'node:crypto';

/**
 * Mirror of the platform's `ActivityActionType` website subset. Change
 * only in lockstep with `apps/api/src/activity-log/dto/ingest-event.dto.ts`
 * in the ever-works repo.
 */
export type WebsiteActionType =
	| 'WEBSITE_USER_REGISTERED'
	| 'WEBSITE_ITEM_SUBMITTED'
	| 'WEBSITE_REPORT_FILED'
	| 'WEBSITE_REPORT_RESOLVED';

export interface EmitActivityInput {
	actionType: WebsiteActionType;
	/** Human-readable one-line summary shown in the feed (max 500 chars). */
	summary: string;
	/** Free-form metadata (capped at 8KB after JSON serialisation). */
	metadata?: Record<string, unknown>;
	/** Defaults to `new Date()`. */
	occurredAt?: Date;
}

interface IngestPayload {
	workId: string;
	eventId: string;
	actionType: WebsiteActionType;
	occurredAt: string;
	summary: string;
	metadata?: Record<string, unknown>;
}

const RETRY_DELAYS_MS = [200, 800];
const REQUEST_TIMEOUT_MS = 5000;
const SUMMARY_MAX_CHARS = 500;

/**
 * Fire-and-forget emit of a single activity event. Always returns a
 * resolved Promise — failures are logged but never thrown.
 *
 * Call sites should use `void emitActivityEvent(...)` so a slow or
 * stalled platform doesn't block the user-facing response.
 */
export async function emitActivityEvent(input: EmitActivityInput): Promise<void> {
	const platformApiUrl = process.env.PLATFORM_API_URL;
	const secret = process.env.PLATFORM_API_SECRET_TOKEN;
	const workId = process.env.PLATFORM_WORK_ID;
	if (!platformApiUrl || !secret || !workId) {
		// Silent: this template runs fine without platform sync configured.
		return;
	}

	const payload: IngestPayload = {
		workId,
		eventId: randomUUID(),
		actionType: input.actionType,
		occurredAt: (input.occurredAt ?? new Date()).toISOString(),
		summary: input.summary.slice(0, SUMMARY_MAX_CHARS),
		...(input.metadata ? { metadata: input.metadata } : {})
	};

	const url = `${stripTrailingSlash(platformApiUrl)}/api/activity-log/ingest`;
	const headers: Record<string, string> = {
		Authorization: `Bearer ${secret}`,
		'Content-Type': 'application/json',
		'User-Agent': 'ever-works-directory-template/activity-feed-push'
	};

	let attempt = 0;
	for (;;) {
		const outcome = await postOnce(url, headers, payload);
		if (outcome.ok) return;
		if (outcome.permanent || attempt >= RETRY_DELAYS_MS.length) {
			console.warn(
				`[platform-activity-push] giving up on eventId=${payload.eventId} actionType=${payload.actionType}: ${outcome.detail}`
			);
			return;
		}
		await sleep(RETRY_DELAYS_MS[attempt]);
		attempt += 1;
	}
}

type PostOutcome =
	| { ok: true }
	| { ok: false; permanent: boolean; detail: string };

async function postOnce(
	url: string,
	headers: Record<string, string>,
	payload: IngestPayload
): Promise<PostOutcome> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(payload),
			signal: controller.signal
		});
		if (response.status === 202) return { ok: true };
		const detail = await safeReadBody(response);
		// 4xx is permanent — the platform won't change its mind on retry:
		// 401 = bad token, 404 = unknown work, 409 = mode-mismatch (work
		// is configured for pull or disabled), 400 = bad payload.
		// 5xx is retryable.
		const permanent = response.status >= 400 && response.status < 500;
		return { ok: false, permanent, detail: `HTTP ${response.status}: ${detail}` };
	} catch (err) {
		// Network errors, timeouts, DNS failures — all retryable.
		const detail = err instanceof Error ? err.message : String(err);
		return { ok: false, permanent: false, detail };
	} finally {
		clearTimeout(timeoutId);
	}
}

async function safeReadBody(response: Response): Promise<string> {
	try {
		const text = await response.text();
		return text.slice(0, 200);
	} catch {
		return '<unreadable body>';
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripTrailingSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}
