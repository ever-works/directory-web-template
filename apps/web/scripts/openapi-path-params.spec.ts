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
 *
 * OpenAPI also requires every `{name}` in a path to have an `in: path` parameter of that name, and
 * every `in: path` parameter to appear in the path. Without that, the reference's "Try it out" and
 * generated clients have no value for the template (`/api/items/{itemId}/comments` declared `slug`)
 * or ask for one the route never reads (`/api/admin/categories/all` declared `id`) (T-2894).
 */

const OPENAPI_FILE = join(__dirname, '..', 'public', 'openapi.json');
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

type Parameter = { name?: string; in?: string; $ref?: string };
type PathItem = { parameters?: Parameter[] } & Partial<
	Record<(typeof HTTP_METHODS)[number], { parameters?: Parameter[] }>
>;
type OpenApiDocument = { paths?: Record<string, PathItem>; components?: Record<string, unknown> };

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

/** The object a local `$ref` (`#/components/parameters/Slug`) points at, or `undefined`. */
function resolveRef(doc: unknown, ref: string): unknown {
	if (!ref.startsWith('#/')) return undefined;
	return ref
		.slice(2)
		.split('/')
		.map((key) => key.replace(/~1/g, '/').replace(/~0/g, '~'))
		.reduce<unknown>(
			(node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
			doc
		);
}

const formatNames = (names: string[]): string => (names.length ? names.map((name) => `{${name}}`).join(', ') : 'none');

/**
 * One line for each operation whose path template names (`{slug}`) differ from the names of its
 * `in: path` parameters, read from the path item and the operation, with `$ref`s resolved.
 */
function pathParamMismatches(doc: OpenApiDocument): string[] {
	const mismatches: string[] = [];
	for (const [path, item] of Object.entries(doc.paths ?? {})) {
		const inTemplate = [...new Set([...path.matchAll(/\{([^}]*)\}/g)].map((match) => match[1]))].sort();
		for (const method of HTTP_METHODS) {
			const operation = item?.[method];
			if (!operation) continue;
			const declared = new Set<string>();
			for (const parameter of [...(item.parameters ?? []), ...(operation.parameters ?? [])]) {
				const resolved = (parameter?.$ref ? resolveRef(doc, parameter.$ref) : parameter) as
					| Parameter
					| undefined;
				if (!resolved) {
					mismatches.push(
						`${method.toUpperCase()} ${path}: parameter $ref ${parameter?.$ref} does not resolve`
					);
					continue;
				}
				if (resolved.in === 'path' && typeof resolved.name === 'string') declared.add(resolved.name);
			}
			const inParameters = [...declared].sort();
			if (inTemplate.join('\n') !== inParameters.join('\n')) {
				mismatches.push(
					`${method.toUpperCase()} ${path}: the path has ${formatNames(inTemplate)}, its path parameters are ${formatNames(inParameters)}`
				);
			}
		}
	}
	return mismatches;
}

const readSpec = (): OpenApiDocument => JSON.parse(readFileSync(OPENAPI_FILE, 'utf8')) as OpenApiDocument;

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

describe('pathParamMismatches', () => {
	it('names each operation whose path template and path parameters differ', () => {
		const slug = { name: 'slug', in: 'path', required: true };
		assert.deepEqual(
			pathParamMismatches({
				paths: {
					// Matches: operation-level, path-level and $ref parameters all count
					'/api/items/{slug}/comments': { get: { parameters: [slug] } },
					'/api/items/{slug}/votes': { parameters: [slug], post: {} },
					'/api/items/{slug}/views': { get: { parameters: [{ $ref: '#/components/parameters/Slug' }] } },
					'/api/items/{slug}/comments/{commentId}': {
						parameters: [slug],
						delete: {
							parameters: [
								{ name: 'commentId', in: 'path' },
								{ name: 'page', in: 'query' }
							]
						}
					},
					// The template names a parameter the operation does not declare
					'/api/items/{itemId}/votes/count': { get: { parameters: [slug] } },
					// No parameter at all for the template
					'/api/user/profile/portfolio/{id}': { patch: {}, delete: {} },
					// A path parameter with no template
					'/api/admin/categories/all': { get: { parameters: [{ name: 'id', in: 'path' }] } },
					// A catch-all template is not a parameter name
					'/api/auth/{...nextauth}': { post: { parameters: [{ name: 'nextauth', in: 'path' }] } },
					// A $ref that points nowhere
					'/api/items/{slug}/activity': { get: { parameters: [{ $ref: '#/components/parameters/Missing' }] } }
				},
				components: { parameters: { Slug: slug } }
			}),
			[
				'GET /api/items/{itemId}/votes/count: the path has {itemId}, its path parameters are {slug}',
				'DELETE /api/user/profile/portfolio/{id}: the path has {id}, its path parameters are none',
				'PATCH /api/user/profile/portfolio/{id}: the path has {id}, its path parameters are none',
				'GET /api/admin/categories/all: the path has none, its path parameters are {id}',
				'POST /api/auth/{...nextauth}: the path has {...nextauth}, its path parameters are {nextauth}',
				'GET /api/items/{slug}/activity: parameter $ref #/components/parameters/Missing does not resolve',
				'GET /api/items/{slug}/activity: the path has {slug}, its path parameters are none'
			]
		);
	});
});

describe('public/openapi.json', () => {
	it('has no two paths that differ only in their path parameter names', () => {
		const paths = Object.keys(readSpec().paths ?? {});
		assert.ok(paths.length > 0, 'public/openapi.json has no paths');

		const duplicates = pathsDifferingOnlyInParamNames(paths).map((group) => group.join(' and '));
		assert.deepEqual(
			duplicates,
			[],
			`These paths describe the same route under different parameter names; keep the one the route's @swagger block uses:\n${duplicates.join('\n')}`
		);
	});

	it('declares an in: path parameter for every {name} in each path, and no other', () => {
		const spec = readSpec();
		assert.ok(Object.keys(spec.paths ?? {}).length > 0, 'public/openapi.json has no paths');

		const mismatches = pathParamMismatches(spec);
		assert.deepEqual(
			mismatches,
			[],
			`Fix the route's @swagger block and its entry in public/openapi.json so the path template and the in: path parameters name the same values:\n${mismatches.join('\n')}`
		);
	});
});
