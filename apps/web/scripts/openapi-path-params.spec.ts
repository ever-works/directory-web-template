import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Two OpenAPI paths that differ only in the names of their path parameters (`/api/items/{itemId}/votes`
 * and `/api/items/{slug}/votes`) are the same route, so the API reference lists it twice and the
 * older copy keeps documenting rules the route no longer follows. `generate-docs` keeps every path
 * already in `public/openapi.json`, so renaming a parameter in a `@swagger` block leaves the old
 * entry behind until someone removes it by hand (T-2874).
 */

const OPENAPI_FILE = join(__dirname, '..', 'public', 'openapi.json');

/** The path with every `{name}` replaced by `{}`, so paths that differ only in parameter names match. */
const routeShape = (path: string): string => path.replace(/\{[^}]*\}/g, '{}');

/** Groups of two or more paths that differ only in their path parameter names. */
function pathsDifferingOnlyInParamNames(paths: Iterable<string>): string[][] {
	const byShape = new Map<string, string[]>();
	for (const path of paths) {
		const shape = routeShape(path);
		byShape.set(shape, [...(byShape.get(shape) ?? []), path]);
	}
	return [...byShape.values()].filter((group) => group.length > 1);
}

describe('pathsDifferingOnlyInParamNames', () => {
	it('groups paths that differ only in a parameter name and leaves other paths alone', () => {
		assert.deepEqual(
			pathsDifferingOnlyInParamNames([
				'/api/items/{itemId}/votes',
				'/api/items/{slug}/votes',
				'/api/items/{slug}/votes/count',
				'/api/items/{slug}/comments/{commentId}',
				'/api/items/{slug}/comments/rating',
				'/api/items/{itemId}'
			]),
			[['/api/items/{itemId}/votes', '/api/items/{slug}/votes']]
		);
	});
});

describe('public/openapi.json', () => {
	it('has no two paths that differ only in their path parameter names', () => {
		const spec = JSON.parse(readFileSync(OPENAPI_FILE, 'utf8')) as { paths?: Record<string, unknown> };
		const paths = Object.keys(spec.paths ?? {});
		assert.ok(paths.length > 0, 'public/openapi.json has no paths');

		const duplicates = pathsDifferingOnlyInParamNames(paths).map((group) => group.join(' and '));
		assert.deepEqual(
			duplicates,
			[],
			`These paths describe the same route under different parameter names; keep the one the route's @swagger block uses:\n${duplicates.join('\n')}`
		);
	});
});
