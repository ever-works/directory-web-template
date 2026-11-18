import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';
import { COMMENT_CONTENT_MAX_LENGTH, validateCommentInput } from '../comment';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `POST /api/items/{slug}/comments` used to accept a non-integer rating (Postgres then
 * refused it for the integer column: 500), crash on a non-string content (500), answer
 * 500 for a malformed JSON body, and store content of any length, while the edit `PUT`
 * already refused all of those. Both handlers now share `validateCommentInput`.
 */
describe('validateCommentInput (new comment: both fields required)', () => {
	it('rejects a rating that is not an integer from 1 to 5', () => {
		for (const rating of [3.5, 0, 6, -1, '4', null]) {
			const result = validateCommentInput({ content: 'ok', rating });
			assert.equal(result.ok, false, `rating ${JSON.stringify(rating)} was accepted`);
		}
	});

	it('rejects content that is not a string', () => {
		const result = validateCommentInput({ content: 5, rating: 4 });
		assert.deepEqual(result, { ok: false, error: 'Content must be a string' });
	});

	it(`rejects content longer than ${COMMENT_CONTENT_MAX_LENGTH} characters`, () => {
		assert.equal(COMMENT_CONTENT_MAX_LENGTH, 1000);
		const result = validateCommentInput({ content: 'a'.repeat(1001), rating: 4 });
		assert.deepEqual(result, { ok: false, error: 'Content must be between 1 and 1000 characters' });
	});

	it('accepts exactly 1000 characters', () => {
		const content = 'a'.repeat(1000);
		assert.deepEqual(validateCommentInput({ content, rating: 1 }), { ok: true, value: { content, rating: 1 } });
	});

	it('trims the content it returns', () => {
		assert.deepEqual(validateCommentInput({ content: '  hi  ', rating: 5 }), {
			ok: true,
			value: { content: 'hi', rating: 5 }
		});
	});

	it('measures the limit after trimming', () => {
		const content = ` ${'a'.repeat(1000)} `;
		assert.deepEqual(validateCommentInput({ content, rating: 3 }), {
			ok: true,
			value: { content: 'a'.repeat(1000), rating: 3 }
		});
	});

	it('requires both fields and non-blank content', () => {
		assert.deepEqual(validateCommentInput({ rating: 4 }), { ok: false, error: 'Content is required' });
		assert.deepEqual(validateCommentInput({ content: 'ok' }), { ok: false, error: 'Rating is required' });
		assert.equal(validateCommentInput({ content: '   ', rating: 4 }).ok, false);
	});

	it('rejects content with a NUL character (Postgres text cannot store it)', () => {
		assert.deepEqual(validateCommentInput({ content: 'a\u0000b', rating: 4 }), {
			ok: false,
			error: 'Content must not contain NUL characters'
		});
	});

	it('rejects a body that is not a JSON object', () => {
		for (const body of [null, 5, 'text', [], undefined]) {
			assert.equal(validateCommentInput(body).ok, false, `${JSON.stringify(body)} was accepted`);
		}
	});
});

describe('validateCommentInput (edit: partial)', () => {
	it('accepts one field on its own', () => {
		assert.deepEqual(validateCommentInput({ rating: 2 }, { partial: true }), { ok: true, value: { rating: 2 } });
		assert.deepEqual(validateCommentInput({ content: ' edited ' }, { partial: true }), {
			ok: true,
			value: { content: 'edited' }
		});
	});

	it('still needs at least one field', () => {
		assert.deepEqual(validateCommentInput({}, { partial: true }), {
			ok: false,
			error: 'At least one of content or rating must be provided'
		});
	});

	it('applies the same rules to the fields it gets', () => {
		assert.equal(validateCommentInput({ rating: 3.5 }, { partial: true }).ok, false);
		assert.equal(validateCommentInput({ content: 5 }, { partial: true }).ok, false);
		assert.equal(validateCommentInput({ content: 'a'.repeat(1001) }, { partial: true }).ok, false);
		assert.equal(validateCommentInput({ content: 'a\u0000b' }, { partial: true }).ok, false);
	});
});

/**
 * The route handlers import the database and Next.js and cannot be loaded under
 * `tsx --test`, so these guards read the source.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

/** The text of one exported function, up to the next top-level export. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const next = src.indexOf(' export ', start + signature.length);
	return src.slice(start, next < 0 ? undefined : next);
};

describe('comment routes validate with validateCommentInput', () => {
	const createRoute = source('../../../app/api/items/[slug]/comments/route.ts');
	const editRoute = source('../../../app/api/items/[slug]/comments/[commentId]/route.ts');

	it('POST answers 400 for a malformed JSON body', () => {
		const post = functionBody(createRoute, 'export async function POST(');
		const parse = post.indexOf('body = await request.json();');
		assert.ok(parse > 0, 'POST does not read the body into its own variable');
		const caught = post.indexOf('} catch {', parse);
		const badRequest = post.indexOf('{ status: 400 }', caught);
		assert.ok(caught > parse, 'POST does not parse the JSON body in its own try/catch');
		assert.ok(badRequest > caught && badRequest - caught < 200, 'a malformed JSON body does not answer 400');
	});

	it('POST validates the body and saves the cleaned values', () => {
		const post = functionBody(createRoute, 'export async function POST(');
		const validate = post.indexOf('validateCommentInput(body)');
		const save = post.indexOf('await createComment({');
		assert.ok(validate > 0, 'POST does not call validateCommentInput');
		assert.ok(save > validate, 'POST saves before it validates');
		assert.ok(
			post.includes('content: input.value.content') && post.includes('rating: input.value.rating'),
			'POST does not pass the validated content and rating to createComment'
		);
		assert.ok(!post.includes('const { content, rating } = await request.json()'), 'POST still reads raw fields');
	});

	it('PUT validates the body with the same helper (partial)', () => {
		const put = functionBody(editRoute, 'export async function PUT(');
		const validate = put.indexOf('validateCommentInput(body, { partial: true })');
		const update = put.indexOf('await updateComment(commentId, {');
		assert.ok(validate > 0, 'PUT does not call validateCommentInput');
		assert.ok(update > validate, 'PUT updates before it validates');
		assert.ok(!put.includes('Number.isInteger(rating)'), 'PUT keeps its own copy of the rating rules');
	});

	it('PUT answers 400 for a malformed JSON body, like POST', () => {
		const put = functionBody(editRoute, 'export async function PUT(');
		const parse = put.indexOf('body = await request.json();');
		assert.ok(parse > 0, 'PUT does not read the body into its own variable');
		const caught = put.indexOf('} catch {', parse);
		const badRequest = put.indexOf('{ status: 400 }', caught);
		assert.ok(caught > parse, 'PUT does not parse the JSON body in its own try/catch');
		assert.ok(badRequest > caught && badRequest - caught < 200, 'a malformed JSON body does not answer 400');
	});
});

describe('the edit / delete route documents its error examples as OpenAPI 3.0 media type examples', () => {
	/** Every `@swagger` block of the route file, parsed as YAML. */
	const swaggerBlocks = (relative: string) => {
		const raw = readFileSync(join(__dirname, relative), 'utf8');
		return [...raw.matchAll(/\/\*\*\s*\n\s*\* @swagger\s*\n([\s\S]*?)\*\//g)].map((match) =>
			parseYaml(match[1].replace(/^[ \t]*\* ?/gm, ''))
		);
	};

	/** True when `examples` appears anywhere inside `value`. */
	const hasExamples = (value: unknown): boolean =>
		!!value &&
		typeof value === 'object' &&
		Object.entries(value).some(([key, child]) => key === 'examples' || hasExamples(child));

	it('puts examples next to the schema, each with a value, never inside the schema', () => {
		const blocks = swaggerBlocks('../../../app/api/items/[slug]/comments/[commentId]/route.ts');
		assert.equal(blocks.length, 2, 'expected the DELETE and PUT @swagger blocks');
		let examples = 0;
		for (const block of blocks) {
			for (const [path, methods] of Object.entries(block as Record<string, Record<string, any>>)) {
				for (const [method, operation] of Object.entries(methods)) {
					for (const [status, response] of Object.entries(operation.responses ?? {}) as [string, any][]) {
						for (const [type, media] of Object.entries(response.content ?? {}) as [string, any][]) {
							const where = `${method.toUpperCase()} ${path} ${status} ${type}`;
							assert.ok(!hasExamples(media.schema), `${where}: examples nested inside the schema`);
							for (const [name, example] of Object.entries(media.examples ?? {}) as [string, any][]) {
								examples++;
								assert.ok(example && 'value' in example, `${where}: example ${name} has no value`);
							}
						}
					}
				}
			}
		}
		assert.ok(examples >= 10, `expected the 400 and 404 examples, found ${examples}`);
	});

	it('the list / create route does the same for its POST 400 examples', () => {
		const blocks = swaggerBlocks('../../../app/api/items/[slug]/comments/route.ts');
		let examples = 0;
		for (const block of blocks) {
			for (const methods of Object.values(block as Record<string, Record<string, any>>)) {
				for (const operation of Object.values(methods)) {
					for (const response of Object.values(operation.responses ?? {}) as any[]) {
						for (const media of Object.values(response.content ?? {}) as any[]) {
							assert.ok(!hasExamples(media.schema), 'examples nested inside the schema');
							for (const example of Object.values(media.examples ?? {}) as any[]) {
								examples++;
								assert.ok(example && 'value' in example);
							}
						}
					}
				}
			}
		}
		assert.ok(examples >= 9, `expected the POST 400 examples, found ${examples}`);
	});
});

describe('comment responses identify the author the same way', () => {
	it('PUT returns the user id as user.id, like GET and POST (the UI checks ownership with it)', () => {
		const route = readFileSync(join(__dirname, '../../../app/api/items/[slug]/comments/[commentId]/route.ts'), 'utf8');
		const select = route.slice(route.indexOf('user: {', route.indexOf('export async function PUT')));
		assert.match(select.slice(0, 400), /id: clientProfiles\.userId,/);
		const queries = readFileSync(join(__dirname, '../../db/queries/comment.queries.ts'), 'utf8');
		assert.doesNotMatch(queries, /user: \{\s*id: clientProfiles\.id,/);
	});
});
