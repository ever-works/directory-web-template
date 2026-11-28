/**
 * Rules every operation of the API reference follows. The specs check them on `public/openapi.json`
 * (what `/api/reference` serves) and on the document `swagger-jsdoc` builds from the `@swagger`
 * blocks, so a bad block fails before anyone copies it into the file by hand
 * (`openapi-path-params.spec.ts`, `openapi-annotations.spec.ts`).
 */

export const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

export type Parameter = { name?: string; in?: string; $ref?: string };
export type Operation = { parameters?: Parameter[]; responses?: unknown };
export type PathItem = { parameters?: Parameter[] } & Partial<Record<(typeof HTTP_METHODS)[number], Operation>>;
export type OpenApiDocument = { paths?: Record<string, PathItem>; components?: Record<string, unknown> };

/** The object a local `$ref` (`#/components/parameters/Slug`) points at, or `undefined`. */
export function resolveRef(doc: unknown, ref: string): unknown {
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
export function pathParamMismatches(doc: OpenApiDocument): string[] {
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

/** A Responses Object key that names a response: `default`, a status code (`200`) or a range (`4XX`). */
const RESPONSE_KEY = /^(?:default|[1-5](?:\d{2}|XX))$/;

/**
 * `METHOD /path` for each operation with no response. OpenAPI 3.0 requires `responses` on every
 * operation, with at least one response code (`default`, `200`, `4XX`; an `x-` extension alone does
 * not count): without it validators reject the document, and the reference and generated clients
 * show no response shape.
 */
export function operationsWithoutResponses(doc: OpenApiDocument): string[] {
	const missing: string[] = [];
	for (const [path, item] of Object.entries(doc.paths ?? {})) {
		for (const method of HTTP_METHODS) {
			const operation = item?.[method];
			if (!operation) continue;
			const { responses } = operation;
			const hasResponse =
				!!responses &&
				typeof responses === 'object' &&
				!Array.isArray(responses) &&
				Object.keys(responses).some((key) => RESPONSE_KEY.test(key));
			if (!hasResponse) missing.push(`${method.toUpperCase()} ${path}`);
		}
	}
	return missing;
}
