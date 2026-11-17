import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * T-2637 — admin checks in the admin client detail page and the page guards.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `session.user.isAdmin` is a JWT claim. `lib/auth/index.ts` sets it only at
 * sign-in and the token lives for 30 days, so a user whose admin role is removed
 * keeps `isAdmin: true` until the token expires (see `admin-claim-routes.spec.ts`
 * for the API routes, T-2566). `/admin/clients/{id}` checked the claim and then
 * loaded the client's profile (email, phone, location), last login, portfolio and
 * stats on the server, so a former admin still received them in the page payload;
 * the client-side admin layout reads the same claim and redirects too late.
 * `requireAdmin()` and `checkIsAdmin()` in `lib/auth/guards.ts` read the claim
 * too. All of them now check the live role with `isAdmin(userId)` from
 * `lib/db/roles.ts`.
 *
 * The page and the guards import Next.js and the auth stack and cannot be loaded
 * under `tsx --test`, so these checks read the source.
 */
const APP_ROOT = join(__dirname, '../../..');

const PAGE = 'app/[locale]/admin/clients/[id]/page.tsx';
const GUARDS = 'lib/auth/guards.ts';

/** Source without block comments (JSDoc) and whole-line `//` comments. */
function code(file: string): string {
	return readFileSync(join(APP_ROOT, file), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '');
}

/** The body of one function: from its declaration to the next top-level `export` / `async function` (or the end). */
function fn(source: string, name: string): string {
	const start = source.search(new RegExp(`(export )?async function ${name}\\s*\\(`));
	assert.ok(start >= 0, `function ${name} not found`);
	const rest = source.slice(start + 1);
	const next = rest.search(/^(export |async function )/m);
	return next >= 0 ? rest.slice(0, next) : rest;
}

const CLAIM = /\buser\??\.isAdmin\b/;
const ROLE_IMPORT = /import\s*\{[^}]*\bisAdmin\b[^}]*\}\s*from\s*'@\/lib\/db\/roles'/;
const LIVE_ROLE = 'await isAdmin(session.user.id)';
/**
 * The live role refuses before anything else runs:
 * `if (!(await isAdmin(session.user.id))) { redirect('/unauthorized'); }` (or `notFound()`),
 * or the same with the answer bound to a name first.
 */
const DENY = String.raw`\{\s*(?:redirect\('\/unauthorized'\)|notFound\(\));\s*\}`;
const LIVE_ROLE_GATE = new RegExp(
	String.raw`if \(!\(await isAdmin\(session\.user\.id\)\)\) ${DENY}|const (\w+) = await isAdmin\(session\.user\.id\);\s*if \(!\1\) ${DENY}`
);

describe(`${PAGE} checks the live admin role before it reads client data`, () => {
	const page = code(PAGE);

	it('never reads user.isAdmin / user?.isAdmin', () => {
		const match = page.match(CLAIM);
		assert.equal(match, null, `the page still checks the sticky JWT claim (${match?.[0]})`);
	});

	it('imports isAdmin from @/lib/db/roles', () => {
		assert.match(page, ROLE_IMPORT);
	});

	it('refuses a signed-in user without the live admin role', () => {
		assert.match(
			page,
			LIVE_ROLE_GATE,
			'the page does not redirect to /unauthorized or 404 when isAdmin(session.user.id) is false'
		);
	});

	it('awaits isAdmin(session.user.id) before getClientProfileById( and the other client queries', () => {
		const role = page.indexOf(LIVE_ROLE);
		assert.ok(role >= 0, `the page does not ${LIVE_ROLE}`);
		for (const query of [
			'getClientProfileById(',
			'getLastLoginActivity(',
			'listPortfolioProjectsForProfile(',
			'getProfileStats('
		]) {
			const at = page.indexOf(query);
			assert.ok(at >= 0, `${query} not found in the page`);
			assert.ok(role < at, `the page calls ${query} before it checks the live role`);
		}
	});

	/** The page source before the live role check. */
	function beforeRole(): string {
		const role = page.indexOf(LIVE_ROLE);
		assert.ok(role >= 0, `the page does not ${LIVE_ROLE}`);
		return page.slice(0, role);
	}

	it('awaits nothing but params and auth() before the live role', () => {
		const before = beforeRole();
		const awaited = [...before.matchAll(/\bawait ([\w.]+(?:\(\))?)/g)].map((m) => m[1]);
		assert.deepEqual(awaited, ['params', 'auth()']);
	});

	it('still sends a signed-out visitor to sign-in before the role lookup', () => {
		const before = beforeRole();
		assert.match(before, /if \(!session\?\.user\?\.id\) \{[^}]*redirect\(`\/\$\{locale\}\/auth\/signin`\);\s*\}/);
	});

	it('does not catch a failed role lookup (it must not fall through to the client data)', () => {
		assert.doesNotMatch(page, /\btry\s*\{|\.catch\(/);
	});
});

describe(`${GUARDS} checks the live admin role`, () => {
	const guards = code(GUARDS);

	it('never reads user.isAdmin / user?.isAdmin', () => {
		const match = guards.match(CLAIM);
		assert.equal(match, null, `guards.ts still checks the sticky JWT claim (${match?.[0]})`);
	});

	it('imports isAdmin from @/lib/db/roles', () => {
		assert.match(guards, ROLE_IMPORT);
	});

	it('the live-role helper answers false for a missing user id or a failed lookup', () => {
		const helper = fn(guards, 'hasLiveAdminRole');
		assert.match(helper, /if \(!userId\) return false;/);
		assert.match(helper, /try \{\s*return await isAdmin\(userId\);\s*\} catch \([^)]*\) \{[^}]*return false;\s*\}/);
	});

	it('requireAdmin() redirects to /unauthorized when the live role is not admin', () => {
		const body = fn(guards, 'requireAdmin');
		assert.match(body, /if \(!session\?\.user\) \{\s*redirect\('\/admin\/auth\/signin'\);\s*\}/);
		assert.match(
			body,
			/if \(!\(await hasLiveAdminRole\(session\.user\.id\)\)\) \{\s*redirect\('\/unauthorized'\);\s*\}/
		);
	});

	it('checkIsAdmin() returns the live role', () => {
		const body = fn(guards, 'checkIsAdmin');
		assert.match(body, /return hasLiveAdminRole\(session\?\.user\?\.id\);/);
	});
});
