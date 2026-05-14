/**
 * EW-120 Activity Feed — pull-mode endpoint.
 *
 * Called by the Ever Works platform's `DirectoryWebsiteClient` to fetch
 * recent user / item / report events from this deployed directory site.
 * Authenticated via HMAC-SHA256 over `${timestamp}:${queryString}:${workId}`
 * (see `lib/services/platform-activity-feed/hmac.ts`).
 *
 * Spec: docs/spec/024-ew-120-platform-activity-feed/
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { safeErrorResponse } from '@/lib/utils/api-error';
import {
	canonicaliseQuery,
	verifyPlatformSignature,
	type CanonicalQuery
} from '@/lib/services/platform-activity-feed/hmac';
import { buildActivityFeed } from '@/lib/services/platform-activity-feed/feed-builder';
import { FEED_TYPE_FILTERS, type FeedTypeFilter } from '@/lib/services/platform-activity-feed/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const querySchema = z.object({
	since: z
		.string()
		.datetime({ offset: true })
		.optional()
		.nullable()
		.transform((v) => v ?? null),
	limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
	types: z
		.string()
		.optional()
		.transform((v) => (v ?? 'all').split(',').filter(Boolean))
		.pipe(z.array(z.enum(FEED_TYPE_FILTERS as readonly [FeedTypeFilter, ...FeedTypeFilter[]])).min(1))
});

export async function GET(request: NextRequest): Promise<NextResponse> {
	const secret = process.env.PLATFORM_SYNC_SECRET;
	const workId = process.env.PLATFORM_WORK_ID;
	if (!secret || !workId) {
		// Surface as 503 so the platform marks it as `not_provisioned`
		// rather than `unauthorized` (different operator messaging).
		return NextResponse.json(
			{ error: 'platform sync not configured on this directory' },
			{ status: 503 }
		);
	}

	let parsed: z.infer<typeof querySchema>;
	try {
		parsed = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
	} catch (err) {
		// The platform classifies 4xx as `parse_error` and stops retrying —
		// preferable to a 500 here so it surfaces immediately in the UI.
		return NextResponse.json(
			{ error: 'invalid query parameters', detail: err instanceof Error ? err.message : 'unknown' },
			{ status: 400 }
		);
	}

	const canonical: CanonicalQuery = {
		since: parsed.since,
		limit: parsed.limit,
		types: parsed.types.join(',')
	};
	const canonicalQuery = canonicaliseQuery(canonical);

	const verdict = verifyPlatformSignature({
		authorizationHeader: request.headers.get('authorization'),
		timestampHeader: request.headers.get('x-platform-ts'),
		canonicalQuery,
		workId,
		secret
	});
	if (!verdict.ok) {
		// Use 401 for every signature-related failure so the platform
		// classifies it uniformly as `unauthorized` (stops retrying).
		return NextResponse.json({ error: 'unauthorized', reason: verdict.reason }, { status: 401 });
	}

	try {
		const adminBaseUrl = process.env.PLATFORM_ADMIN_BASE_URL ?? request.nextUrl.origin;
		const body = await buildActivityFeed(
			{
				since: parsed.since ? new Date(parsed.since) : null,
				limit: parsed.limit,
				filters: parsed.types
			},
			adminBaseUrl
		);
		return NextResponse.json(body, { status: 200 });
	} catch (err) {
		return safeErrorResponse(err, 'Failed to build activity feed');
	}
}
