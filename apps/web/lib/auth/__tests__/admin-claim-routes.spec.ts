import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * T-2566 — admin checks in the survey, item-company and geocode API routes.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `session.user.isAdmin` is a JWT claim. `lib/auth/index.ts` sets it only at
 * sign-in, and the token lives for 30 days, so an admin whose role is removed
 * (or whose user is deleted) keeps `isAdmin: true` until the token expires.
 * `lib/auth/admin-guard.ts` says so and checks the live role in the database
 * instead; every `/api/admin/*` route goes through it. These routes checked the
 * claim, so a former admin could still create, edit and delete surveys, read
 * every survey response, change item company links and spend the geocoding
 * quota. They now use `requireAdminSession()` / `checkAdminAuth()`, or the live
 * `isAdmin(userId)` from `lib/db/roles.ts` where a non-admin still gets an
 * answer (the survey list and the unpublished-survey read).
 *
 * The route handlers import Next.js and the auth stack and cannot be loaded
 * under `tsx --test`, so these checks read the source.
 */
const APP_ROOT = join(__dirname, '../../..');

const ROUTE_FILES = [
	'app/api/surveys/route.ts',
	'app/api/surveys/[surveyId]/route.ts',
	'app/api/surveys/[surveyId]/responses/route.ts',
	'app/api/surveys/responses/[responseId]/route.ts',
	'app/api/items/[slug]/company/route.ts',
	'app/api/geocode/route.ts'
] as const;

type RouteFile = (typeof ROUTE_FILES)[number];
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Route source without block comments (the Swagger docs) and whole-line `//` comments. */
function code(file: RouteFile): string {
	return readFileSync(join(APP_ROOT, file), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '');
}

/** The body of one exported handler: from its `export async function` to the next one (or the end of the file). */
function handler(file: RouteFile, method: Method): string {
	const source = code(file);
	const start = source.search(new RegExp(`export async function ${method}\\s*\\(`));
	assert.ok(start >= 0, `${method} handler not found in ${file}`);
	const rest = source.slice(start + 1);
	const next = rest.search(/export async function [A-Z]+\s*\(/);
	return next >= 0 ? rest.slice(0, next) : rest;
}

const CLAIM = /\buser\??\.isAdmin\b/;
const LIVE_GUARD = /\bawait (requireAdminSession|checkAdminAuth)\(\)/;
const LIVE_ROLE = /\bawait isAdmin\(session\.user\.id\)/;

const GUARD_IMPORT =
	/import\s*\{[^}]*\b(requireAdminSession|checkAdminAuth)\b[^}]*\}\s*from\s*'@\/lib\/auth\/admin-guard'/;
const ROLE_IMPORT = /import\s*\{[^}]*\bisAdmin\b[^}]*\}\s*from\s*'@\/lib\/db\/roles'/;

describe('admin routes do not authorize on the JWT isAdmin claim', () => {
	for (const file of ROUTE_FILES) {
		it(`${file} never reads user.isAdmin / user?.isAdmin`, () => {
			const match = code(file).match(CLAIM);
			assert.equal(match, null, `${file} still checks the sticky JWT claim (${match?.[0]})`);
		});

		it(`${file} imports the live admin check`, () => {
			const source = code(file);
			assert.ok(
				GUARD_IMPORT.test(source) || ROLE_IMPORT.test(source),
				`${file} imports neither requireAdminSession / checkAdminAuth from @/lib/auth/admin-guard nor isAdmin from @/lib/db/roles`
			);
		});
	}
});

/** Handlers that only an admin may call: each must run the DB-backed guard. */
const ADMIN_ONLY: ReadonlyArray<[RouteFile, Method]> = [
	['app/api/surveys/route.ts', 'POST'],
	['app/api/surveys/[surveyId]/route.ts', 'PUT'],
	['app/api/surveys/[surveyId]/route.ts', 'DELETE'],
	['app/api/surveys/[surveyId]/responses/route.ts', 'GET'],
	['app/api/surveys/responses/[responseId]/route.ts', 'GET'],
	['app/api/items/[slug]/company/route.ts', 'GET'],
	['app/api/items/[slug]/company/route.ts', 'POST'],
	['app/api/items/[slug]/company/route.ts', 'DELETE'],
	['app/api/geocode/route.ts', 'POST']
];

describe('admin-only handlers use requireAdminSession() / checkAdminAuth()', () => {
	for (const [file, method] of ADMIN_ONLY) {
		it(`${method} ${file}`, () => {
			assert.match(
				handler(file, method),
				LIVE_GUARD,
				`${method} in ${file} does not await requireAdminSession() or checkAdminAuth()`
			);
		});
	}
});

describe('handlers that also answer non-admins check the live role', () => {
	it('GET /api/surveys builds the list filters from isAdmin(session.user.id)', () => {
		const get = handler('app/api/surveys/route.ts', 'GET');
		assert.match(get, LIVE_ROLE, 'GET /api/surveys does not await isAdmin(session.user.id)');
		assert.ok(
			get.includes('buildSurveyListFilters(searchParams, userIsAdmin)'),
			'GET /api/surveys does not pass the live role to buildSurveyListFilters'
		);
	});

	it('GET /api/surveys/{surveyId} shows an unpublished survey only when isAdmin(session.user.id) is true', () => {
		const get = handler('app/api/surveys/[surveyId]/route.ts', 'GET');
		const unpublished = get.indexOf("survey.status !== 'published'");
		assert.ok(unpublished >= 0, 'unpublished-survey branch not found');
		assert.match(
			get.slice(unpublished),
			LIVE_ROLE,
			'the unpublished branch does not await isAdmin(session.user.id)'
		);
	});
});
