import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

/**
 * T-2646 — `/client/notifications` and `/client/notifications/preferences` send a
 * signed-out visitor to the sign-in page that exists.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The sign-in route is `app/[locale]/auth/signin`. Both notification pages
 * redirected a signed-out visitor to `/auth/sign-in?callbackUrl=...`, a route that
 * does not exist, so the visitor got a 404 instead of the sign-in form. They now
 * redirect the way `/sponsor` does: to `/${locale}/auth/signin` (as
 * `/client/dashboard` and `/client/sponsorships` do), keeping the visitor's
 * locale, with a locale-prefixed `callbackUrl` back to the page.
 *
 * The pages import Next.js and the auth stack and cannot be loaded under
 * `tsx --test`, so these checks read the source.
 */
const APP_ROOT = join(__dirname, '../../..');

const SIGNIN_ROUTE = 'app/[locale]/auth/signin/page.tsx';
/** The path that does not exist, built in pieces so this file does not trip its own scan. */
const MISSING_SIGNIN = ['/auth', 'sign-in'].join('/');

const PAGES = [
	{ file: 'app/[locale]/client/notifications/page.tsx', callback: '/client/notifications' },
	{
		file: 'app/[locale]/client/notifications/preferences/page.tsx',
		callback: '/client/notifications/preferences'
	}
] as const;

/** Source without block comments (JSDoc) and whole-line `//` comments. */
function code(file: string): string {
	return readFileSync(join(APP_ROOT, file), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '');
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** Every .ts / .tsx source file under `dir`, skipping tests and build output. */
function sourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules' || name === '.next' || name === '__tests__') continue;
		const full = join(dir, name);
		if (statSync(full).isDirectory()) {
			out.push(...sourceFiles(full));
		} else if (/\.tsx?$/.test(name) && !/\.(spec|test)\.tsx?$/.test(name)) {
			out.push(full);
		}
	}
	return out;
}

describe('the sign-in route', () => {
	it(`lives at ${SIGNIN_ROUTE}, and app/[locale]${MISSING_SIGNIN} does not exist`, () => {
		assert.ok(existsSync(join(APP_ROOT, SIGNIN_ROUTE)), `${SIGNIN_ROUTE} is missing`);
		assert.ok(
			!existsSync(join(APP_ROOT, 'app/[locale]', MISSING_SIGNIN)),
			`app/[locale]${MISSING_SIGNIN} exists; update this spec`
		);
	});
});

for (const { file, callback } of PAGES) {
	describe(`${file} sends a signed-out visitor to sign-in`, () => {
		const page = code(file);

		it('reads the locale from the route params', () => {
			assert.match(page, /export default async function \w+\(\{\s*params\s*\}/);
			assert.match(page, /const \{ locale \} = await params;/);
		});

		it(`redirects to /\${locale}/auth/signin with callbackUrl=/\${locale}${callback}`, () => {
			const target = escapeRegExp(`\`/\${locale}/auth/signin?callbackUrl=/\${locale}${callback}\``);
			assert.match(
				page,
				new RegExp(String.raw`if \(!session\?\.user\?\.id\) \{\s*redirect\(${target}\);\s*\}`),
				'the signed-out branch does not redirect to the localized /auth/signin with a callback to this page'
			);
		});

		it(`never redirects to ${MISSING_SIGNIN}`, () => {
			assert.ok(!page.includes(MISSING_SIGNIN), `the page still links to ${MISSING_SIGNIN}`);
		});
	});
}

describe(`no apps/web source points at ${MISSING_SIGNIN}`, () => {
	it('app/, components/, hooks/ and lib/ only use /auth/signin', () => {
		const offenders: string[] = [];
		for (const dir of ['app', 'components', 'hooks', 'lib']) {
			const root = join(APP_ROOT, dir);
			if (!existsSync(root)) continue;
			for (const full of sourceFiles(root)) {
				const source = readFileSync(full, 'utf8');
				source.split('\n').forEach((line, i) => {
					if (line.includes(MISSING_SIGNIN)) {
						offenders.push(`${relative(APP_ROOT, full).replace(/\\/g, '/')}:${i + 1}`);
					}
				});
			}
		}
		assert.deepEqual(offenders, [], `${MISSING_SIGNIN} is not a route; use /auth/signin`);
	});
});
