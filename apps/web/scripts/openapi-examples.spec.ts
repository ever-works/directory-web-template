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
 * belong next to `schema`, on the media type (or the parameter), as a map of Example Objects that
 * each carry a `value`. This reads every `@swagger` block `generate-docs` reads
 * (`scripts/generate-openapi.ts` `apis`) and checks that.
 */

const webRoot = join(__dirname, '..');
/** The folders `generate-openapi.ts` scans (its `apis` globs). */
const SCANNED_DIRS = ['app/api', 'lib/payment', 'lib/types'];
const SCHEMA_LISTS = ['allOf', 'anyOf', 'oneOf'] as const;
const SCHEMA_CHILDREN = ['items', 'not', 'additionalProperties'] as const;
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

type Node = Record<string, any>;
const isObject = (value: unknown): value is Node => !!value && typeof value === 'object' && !Array.isArray(value);

function sourceFiles(): string[] {
	return SCANNED_DIRS.flatMap((dir) =>
		(readdirSync(join(webRoot, dir), { recursive: true }) as string[])
			.filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.d.ts'))
			.map((file) => join(webRoot, dir, file))
	);
}

/** Every `@swagger` / `@openapi` JSDoc block of a file, parsed as YAML. */
function swaggerBlocks(file: string): Array<{ where: string; doc: Node }> {
	const raw = readFileSync(file, 'utf8');
	const name = relative(webRoot, file).replace(/\\/g, '/');
	const blocks: Array<{ where: string; doc: Node }> = [];
	for (const match of raw.matchAll(/\/\*\*([\s\S]*?)\*\//g)) {
		const lines = match[1].split('\n').map((line) => line.replace(/^[ \t]*\* ?/, ''));
		const tag = lines.findIndex((line) => /^\s*@(swagger|openapi)\s*$/.test(line));
		if (tag < 0) continue;
		const line = raw.slice(0, match.index).split('\n').length;
		const doc = parseYaml(lines.slice(tag + 1).join('\n'));
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

/** A Media Type or Parameter Object: `examples` beside `schema`, each with a `value` (or a `$ref`). */
function checkExampleHolder(holder: unknown, where: string, problems: string[], counter: { examples: number }): void {
	if (!isObject(holder)) return;
	checkSchema(holder.schema, `${where} schema`, problems);
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

function checkContent(content: unknown, where: string, problems: string[], counter: { examples: number }): void {
	if (!isObject(content)) return;
	for (const [type, media] of Object.entries(content))
		checkExampleHolder(media, `${where} ${type}`, problems, counter);
}

function checkOperation(operation: Node, where: string, problems: string[], counter: { examples: number }): void {
	for (const parameter of Array.isArray(operation.parameters) ? operation.parameters : []) {
		checkExampleHolder(parameter, `${where} parameter ${parameter?.name ?? '?'}`, problems, counter);
	}
	checkContent(operation.requestBody?.content, `${where} requestBody`, problems, counter);
	for (const [status, response] of Object.entries(isObject(operation.responses) ? operation.responses : {})) {
		checkContent((response as Node)?.content, `${where} ${status}`, problems, counter);
	}
}

function scan(): { problems: string[]; examples: number; blocks: number } {
	const problems: string[] = [];
	const counter = { examples: 0 };
	let blocks = 0;
	for (const file of sourceFiles()) {
		for (const { where, doc } of swaggerBlocks(file)) {
			blocks++;
			for (const [key, value] of Object.entries(doc)) {
				if (key === 'components') {
					for (const [name, schema] of Object.entries(isObject(value?.schemas) ? value.schemas : {}))
						checkSchema(schema, `${where} components.schemas.${name}`, problems);
					continue;
				}
				if (!key.startsWith('/') || !isObject(value)) continue;
				for (const [method, operation] of Object.entries(value)) {
					if (method === 'parameters' && Array.isArray(operation)) {
						for (const parameter of operation)
							checkExampleHolder(parameter, `${where} ${key} parameter`, problems, counter);
					}
					if (HTTP_METHODS.has(method) && isObject(operation))
						checkOperation(operation, `${where} ${method.toUpperCase()} ${key}`, problems, counter);
				}
			}
		}
	}
	return { problems, examples: counter.examples, blocks };
}

describe('@swagger blocks use OpenAPI 3.0 examples', () => {
	const result = scan();

	it('reads the route documentation', () => {
		assert.ok(result.blocks > 100, `expected the route @swagger blocks, found ${result.blocks}`);
	});

	it('never puts examples inside a schema, and gives every named example a value', () => {
		assert.deepEqual(result.problems, []);
		assert.ok(result.examples > 50, `expected the named examples, found ${result.examples}`);
	});
});
