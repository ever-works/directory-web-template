import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `POST /api/version/sync` pulls the data repository, flushes every content cache and
 * (when location features are on) rebuilds the location index, so only an admin may trigger it. Before this guard any
 * signed-in user (including one who had just registered) could call it in a loop.
 * The route handler imports Next.js and the auth stack and cannot be loaded under
 * `tsx --test`, so these checks read the source.
 */
const route = readFileSync(join(__dirname, '../../app/api/version/sync/route.ts'), 'utf8').replace(/\s+/g, ' ');

/** The text of one exported function, up to the next top-level export. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const next = src.indexOf(' export ', start + signature.length);
	return src.slice(start, next < 0 ? undefined : next);
};

describe('POST /api/version/sync is admin-only', () => {
	const post = functionBody(route, 'export async function POST(');

	it('imports requireAdminSession from the shared admin guard', () => {
		assert.ok(
			/import \{[^}]*\brequireAdminSession\b[^}]*\} from ["']@\/lib\/auth\/admin-guard["']/.test(route),
			'the route does not import requireAdminSession from @/lib/auth/admin-guard'
		);
	});

	it('POST runs requireAdminSession() and returns its response before triggerManualSync()', () => {
		const guard = post.indexOf('await requireAdminSession()');
		const bail = post.indexOf('if (authResult instanceof NextResponse) {');
		const body = post.indexOf('request.json()');
		const sync = post.indexOf('triggerManualSync()');
		assert.ok(guard > 0, 'POST does not call requireAdminSession()');
		assert.ok(bail > guard, 'POST does not return the 401/403 response from requireAdminSession()');
		assert.ok(sync > 0, 'POST no longer calls triggerManualSync()');
		assert.ok(bail < sync, 'the admin check must run before triggerManualSync()');
		assert.ok(body < 0 || bail < body, 'the admin check must run before the request body is read');
	});

	it('POST passes 401/403 through and answers a failed admin check (500) with the sync error shape', () => {
		// The documented 500 body carries timestamp and duration; the guard's own 500 has neither.
		const bail = post.indexOf('if (authResult instanceof NextResponse) {');
		const branch = post.slice(bail, post.indexOf('return authResult; }', bail) + 'return authResult; }'.length);
		assert.ok(bail > 0 && branch.endsWith('return authResult; }'), 'the guard branch does not return authResult');
		const serverError = branch.indexOf('if (authResult.status >= 500) {');
		assert.ok(serverError > 0, 'a 500 from requireAdminSession() is returned as is');
		assert.ok(
			/if \(authResult\.status >= 500\) \{ return createSyncResponse\(false, "[^"]+", Date\.now\(\) - startTime\); \}/.test(
				branch
			),
			'a 500 from requireAdminSession() does not go through createSyncResponse()'
		);
		assert.ok(
			serverError < branch.lastIndexOf('return authResult;'),
			'the 500 check must run before the guard response is returned'
		);
	});

	it('POST no longer accepts any signed-in user', () => {
		assert.ok(!post.includes('if (!session?.user)'), 'POST still gates only on a signed-in session');
		assert.ok(!post.includes('await auth()'), 'POST still resolves the session with a bare auth() call');
	});

	it('GET stays a public status read', () => {
		const get = functionBody(route, 'export async function GET(');
		assert.ok(get.includes('getSyncStatus()'), 'GET does not read the sync status');
		assert.ok(!get.includes('requireAdminSession'), 'GET must stay public');
		assert.ok(!get.includes('auth()'), 'GET must not resolve a session');
		assert.ok(!get.includes('triggerManualSync'), 'GET must not trigger a sync');
	});
});
