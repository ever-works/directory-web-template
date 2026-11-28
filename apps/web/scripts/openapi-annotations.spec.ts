import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import swaggerJSDoc from 'swagger-jsdoc';

import { swaggerOptions } from './generate-openapi';
import { type OpenApiDocument, operationsWithoutResponses, pathParamMismatches } from './openapi-rules';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * OpenAPI 3.0 requires `responses` on every operation. Without it, validators reject the API
 * reference served at `/api/reference` (from `public/openapi.json`), and "Try it out" and generated
 * clients show no response shape (the follow and security notification routes had none, T-2906).
 *
 * `generate-docs` keeps every path already in `public/openapi.json` and merges the `@swagger` blocks
 * into it, so a bad block shows up only once someone copies it into the file. This spec builds the
 * document from the blocks the way `generate-docs` does (`swagger-jsdoc` with its `apis` globs) and
 * checks every operation there, and in `public/openapi.json`, has responses and matching path
 * parameters.
 */

const webRoot = join(__dirname, '..');
const OPENAPI_FILE = join(webRoot, 'public', 'openapi.json');

/**
 * The document `swagger-jsdoc` builds from the `@swagger` blocks. `generate-docs` runs from
 * `apps/web` and `swagger-jsdoc` resolves its globs from the working directory, so the same globs
 * are rooted there; a block that is not valid YAML throws instead of being dropped. Built once.
 */
let annotated: OpenApiDocument | undefined;
function documentFromAnnotations(): OpenApiDocument {
	const apis = swaggerOptions.apis.map((api) => join(webRoot, api).replace(/\\/g, '/'));
	annotated ??= swaggerJSDoc({ ...swaggerOptions, apis, failOnErrors: true }) as OpenApiDocument;
	return annotated;
}

describe('operationsWithoutResponses', () => {
	it('names each operation with no response code, and only those', () => {
		const ok = { 200: { description: 'OK' } };
		assert.deepEqual(
			operationsWithoutResponses({
				paths: {
					'/api/a': { get: { responses: ok }, parameters: [] },
					'/api/b': { get: {}, post: { responses: {} }, patch: { responses: ok } },
					'/api/c/{id}': { delete: { responses: [] as unknown as Record<string, unknown> } }
				}
			}),
			['GET /api/b', 'POST /api/b', 'DELETE /api/c/{id}']
		);
	});
});

describe('the @swagger blocks, as generate-docs reads them', () => {
	const doc = documentFromAnnotations();

	it('reads the route documentation', () => {
		const paths = Object.keys(doc.paths ?? {}).length;
		assert.ok(paths > 100, `expected the route @swagger blocks, found ${paths} paths`);
	});

	it('gives every operation at least one response', () => {
		const missing = operationsWithoutResponses(doc);
		assert.deepEqual(
			missing,
			[],
			`Add a responses: map (at least the 200 the handler returns) to the @swagger block of:\n${missing.join('\n')}`
		);
	});

	it('declares an in: path parameter for every {name} in each path, and no other', () => {
		const mismatches = pathParamMismatches(doc);
		assert.deepEqual(
			mismatches,
			[],
			`Fix the route's @swagger block so the path template and the in: path parameters name the same values:\n${mismatches.join('\n')}`
		);
	});
});

describe('GET /api/admin/categories/all', () => {
	type CategoriesAll = {
		parameters?: Array<{ name?: string; in?: string; required?: boolean }>;
		responses?: Record<string, { content?: Record<string, { schema?: { properties?: Record<string, unknown> } }> }>;
	};
	const operationIn = (doc: OpenApiDocument) =>
		doc.paths?.['/api/admin/categories/all']?.get as CategoriesAll | undefined;

	it('documents the optional locale query and the array the route returns, in the block and the file', () => {
		const file = JSON.parse(readFileSync(OPENAPI_FILE, 'utf8')) as OpenApiDocument;
		for (const [where, doc] of [
			['@swagger block', documentFromAnnotations()],
			['public/openapi.json', file]
		] as const) {
			const operation = operationIn(doc);
			assert.ok(operation, `${where} has no GET /api/admin/categories/all`);
			const locale = operation.parameters?.find((parameter) => parameter.name === 'locale');
			assert.equal(locale?.in, 'query', `${where}: the route reads ?locale=`);
			assert.notEqual(locale?.required, true, `${where}: locale is optional, the route falls back to en`);
			assert.deepEqual(
				operation.responses?.['200']?.content?.['application/json']?.schema?.properties?.data,
				{ type: 'array', items: { $ref: '#/components/schemas/Category' } },
				`${where}: the route answers data: categories, an array`
			);
		}
	});
});

describe('public/openapi.json', () => {
	it('gives every operation at least one response', () => {
		const spec = JSON.parse(readFileSync(OPENAPI_FILE, 'utf8')) as OpenApiDocument;
		assert.ok(Object.keys(spec.paths ?? {}).length > 0, 'public/openapi.json has no paths');

		const missing = operationsWithoutResponses(spec);
		assert.deepEqual(
			missing,
			[],
			`Add the responses of the route's @swagger block to these entries of public/openapi.json:\n${missing.join('\n')}`
		);
	});
});
