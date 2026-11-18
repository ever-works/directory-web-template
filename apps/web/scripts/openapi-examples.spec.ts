import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * OpenAPI 3.0 has no `examples` keyword in a Schema Object (only the single `example`), so named
 * examples written inside a `schema` are invalid and the generated documentation drops them. They
 * belong next to `schema`, on the media type (or the parameter / header), as a map of Example
 * Objects that each carry a `value`, and a media type has `example` or `examples`, never both.
 *
 * Checked twice: on every `@swagger` block `generate-docs` reads (`scripts/generate-openapi.ts`
 * `apis`), to name the file and line, and on the generated `public/openapi.json`, where
 * `swagger-jsdoc` has merged blocks that describe the same operation.
 */

const webRoot = join(__dirname, '..');
/** The folders `generate-openapi.ts` scans: its `apis` globs take every `.ts` file under them. */
const SCANNED_DIRS = ['app/api', 'lib/payment', 'lib/types'];
const SCHEMA_LISTS = ['allOf', 'anyOf', 'oneOf'] as const;
const SCHEMA_CHILDREN = ['items', 'not', 'additionalProperties'] as const;
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

type Node = Record<string, any>;
type Counter = { examples: number };
const isObject = (value: unknown): value is Node => !!value && typeof value === 'object' && !Array.isArray(value);

function sourceFiles(): string[] {
	return SCANNED_DIRS.flatMap((dir) =>
		(readdirSync(join(webRoot, dir), { recursive: true }) as string[])
			.filter((file) => file.endsWith('.ts'))
			.map((file) => join(webRoot, dir, file))
	);
}

/**
 * Every `@swagger` / `@openapi` JSDoc block of a file, parsed as YAML. Like `swagger-jsdoc`, the
 * tag's text ends at the next JSDoc tag (`@see`, `@param`, ...).
 */
function swaggerBlocks(file: string): Array<{ where: string; doc: Node }> {
	const raw = readFileSync(file, 'utf8');
	const name = relative(webRoot, file).replace(/\\/g, '/');
	const blocks: Array<{ where: string; doc: Node }> = [];
	for (const match of raw.matchAll(/\/\*\*([\s\S]*?)\*\//g)) {
		const lines = match[1].split(/\r?\n/).map((line) => line.replace(/^[ \t]*\* ?/, ''));
		const tag = lines.findIndex((line) => /^\s*@(swagger|openapi)\s*$/.test(line));
		if (tag < 0) continue;
		const rest = lines.slice(tag + 1);
		const next = rest.findIndex((line) => /^\s*@\w+/.test(line));
		const line = raw.slice(0, match.index).split('\n').length;
		const doc = parseYaml((next < 0 ? rest : rest.slice(0, next)).join('\n'));
		if (isObject(doc)) blocks.push({ where: `${name}:${line}`, doc });
	}
	return blocks;
}

/** A Schema Object and the schemas inside it; property names are not keywords. */
function checkSchema(schema: unknown, where: string, problems: string[]): void {
	if (!isObject(schema)) return;
	if ('examples' in schema) problems.push(`${where}: examples inside a schema`);
	for (const key of SCHEMA_CHILDREN) checkSchema(schema[key], `${where}.${key}`, problems);
	for (const key of SCHEMA_LISTS) {
		if (Array.isArray(schema[key]))
			schema[key].forEach((child: unknown, i: number) => checkSchema(child, `${where}.${key}[${i}]`, problems));
	}
	if (isObject(schema.properties)) {
		for (const [name, child] of Object.entries(schema.properties))
			checkSchema(child, `${where}.properties.${name}`, problems);
	}
}

/**
 * A Media Type, Parameter or Header Object: `examples` beside `schema`, each with a `value` (or a
 * `$ref`); a parameter or header may describe itself with `content` instead of `schema`.
 */
function checkExampleHolder(holder: unknown, where: string, problems: string[], counter: Counter): void {
	if (!isObject(holder)) return;
	checkSchema(holder.schema, `${where} schema`, problems);
	checkContent(holder.content, `${where} content`, problems, counter);
	if (holder.examples === undefined) return;
	if (holder.example !== undefined) problems.push(`${where}: both example and examples`);
	if (!isObject(holder.examples)) {
		problems.push(`${where}: examples is not a map of Example Objects`);
		return;
	}
	for (const [name, example] of Object.entries(holder.examples)) {
		counter.examples++;
		if (!isObject(example) || !('value' in example || '$ref' in example || 'externalValue' in example)) {
			problems.push(`${where}: example ${name} has no value`);
		}
	}
}

function checkContent(content: unknown, where: string, problems: string[], counter: Counter): void {
	if (!isObject(content)) return;
	for (const [type, media] of Object.entries(content))
		checkExampleHolder(media, `${where} ${type}`, problems, counter);
}

/** A Response Object: its body and its headers. */
function checkResponse(response: unknown, where: string, problems: string[], counter: Counter): void {
	if (!isObject(response)) return;
	checkContent(response.content, where, problems, counter);
	for (const [name, header] of Object.entries(isObject(response.headers) ? response.headers : {}))
		checkExampleHolder(header, `${where} header ${name}`, problems, counter);
}

function checkOperation(operation: Node, where: string, problems: string[], counter: Counter): void {
	for (const parameter of Array.isArray(operation.parameters) ? operation.parameters : []) {
		checkExampleHolder(parameter, `${where} parameter ${parameter?.name ?? '?'}`, problems, counter);
	}
	checkContent(operation.requestBody?.content, `${where} requestBody`, problems, counter);
	for (const [status, response] of Object.entries(isObject(operation.responses) ? operation.responses : {})) {
		checkResponse(response, `${where} ${status}`, problems, counter);
	}
}

function checkPathItem(path: string, item: unknown, where: string, problems: string[], counter: Counter): void {
	if (!isObject(item)) return;
	for (const [method, operation] of Object.entries(item)) {
		if (method === 'parameters' && Array.isArray(operation)) {
			for (const parameter of operation)
				checkExampleHolder(parameter, `${where} ${path} parameter`, problems, counter);
		}
		if (HTTP_METHODS.has(method) && isObject(operation))
			checkOperation(operation, `${where} ${method.toUpperCase()} ${path}`, problems, counter);
	}
}

function checkComponents(components: unknown, where: string, problems: string[], counter: Counter): void {
	if (!isObject(components)) return;
	const section = (name: string) => Object.entries(isObject(components[name]) ? components[name] : {});
	for (const [name, schema] of section('schemas'))
		checkSchema(schema, `${where} components.schemas.${name}`, problems);
	for (const [name, response] of section('responses'))
		checkResponse(response, `${where} components.responses.${name}`, problems, counter);
	for (const [name, parameter] of section('parameters'))
		checkExampleHolder(parameter, `${where} components.parameters.${name}`, problems, counter);
	for (const [name, header] of section('headers'))
		checkExampleHolder(header, `${where} components.headers.${name}`, problems, counter);
	for (const [name, body] of section('requestBodies'))
		checkContent((body as Node)?.content, `${where} components.requestBodies.${name}`, problems, counter);
}

/** A whole document or one `@swagger` block: paths at the top level (`swagger-jsdoc`) or under `paths`. */
function checkDocument(doc: Node, where: string, problems: string[], counter: Counter): void {
	for (const [key, value] of Object.entries(doc)) {
		if (key === 'components') checkComponents(value, where, problems, counter);
		else if (key === 'paths' && isObject(value)) {
			for (const [path, item] of Object.entries(value)) checkPathItem(path, item, where, problems, counter);
		} else if (key.startsWith('/')) checkPathItem(key, value, where, problems, counter);
	}
}

describe('@swagger blocks use OpenAPI 3.0 examples', () => {
	const problems: string[] = [];
	const counter: Counter = { examples: 0 };
	let blocks = 0;
	for (const file of sourceFiles()) {
		for (const { where, doc } of swaggerBlocks(file)) {
			blocks++;
			checkDocument(doc, where, problems, counter);
		}
	}

	it('reads the route documentation', () => {
		assert.ok(blocks > 100, `expected the route @swagger blocks, found ${blocks}`);
	});

	it('never puts examples inside a schema, and gives every named example a value', () => {
		assert.deepEqual(problems, []);
		assert.ok(counter.examples > 50, `expected the named examples, found ${counter.examples}`);
	});

	it('so does the generated openapi.json, where blocks of one operation are merged', () => {
		const spec = JSON.parse(readFileSync(join(webRoot, 'public/openapi.json'), 'utf8')) as Node;
		const generated: string[] = [];
		const generatedCounter: Counter = { examples: 0 };
		checkDocument(spec, 'openapi.json', generated, generatedCounter);
		assert.deepEqual(generated, []);
		assert.ok(generatedCounter.examples > 50, `expected the named examples, found ${generatedCounter.examples}`);
	});
});

describe('the checker itself', () => {
	const problemsOf = (doc: Node) => {
		const problems: string[] = [];
		checkDocument(doc, 'x', problems, { examples: 0 });
		return problems;
	};
	const bad = { content: { 'application/json': { schema: { type: 'string', examples: ['a'] } } } };

	it('finds examples in a schema under paths, parameter content, headers and reusable responses', () => {
		assert.equal(problemsOf({ paths: { '/a': { get: { responses: { 400: bad } } } } }).length, 1);
		assert.equal(
			problemsOf({ '/a': { get: { parameters: [{ name: 'q', in: 'query', ...bad }], responses: {} } } }).length,
			1
		);
		assert.equal(
			problemsOf({
				'/a': { get: { responses: { 429: { headers: { 'Retry-After': { schema: { examples: [1] } } } } } } }
			}).length,
			1
		);
		assert.equal(problemsOf({ components: { responses: { BadRequest: bad } } }).length, 1);
	});

	it('finds a named example without a value, and example next to examples', () => {
		const media = (extra: Node) => ({
			'/a': {
				get: {
					responses: { 400: { content: { 'application/json': { schema: { type: 'object' }, ...extra } } } }
				}
			}
		});
		assert.equal(problemsOf(media({ examples: { bad: { summary: 'x' } } })).length, 1);
		assert.equal(problemsOf(media({ example: {}, examples: { ok: { value: {} } } })).length, 1);
		assert.deepEqual(problemsOf(media({ examples: { ok: { value: {} } } })), []);
	});
});
