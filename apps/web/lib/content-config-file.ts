import path from 'node:path';
import fs from 'node:fs/promises';

export const PRIMARY_CONTENT_CONFIG_FILENAME = '.works/works.yml';
export const CONTENT_CONFIG_FILENAMES = [PRIMARY_CONTENT_CONFIG_FILENAME] as const;

export function getPrimaryContentConfigPath(contentPath: string): string {
	return path.join(contentPath, PRIMARY_CONTENT_CONFIG_FILENAME);
}

export function getContentConfigPaths(contentPath: string): string[] {
	return CONTENT_CONFIG_FILENAMES.map((filename) => path.join(contentPath, filename));
}

export async function hasContentConfigFile(contentPath: string): Promise<boolean> {
	for (const configPath of getContentConfigPaths(contentPath)) {
		try {
			await fs.access(configPath);
			return true;
		} catch {
			// Try the next supported config filename.
		}
	}

	return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge two plain config objects, with `override` taking precedence
 * over `base`.
 *
 * **Recurse condition** — merging recurses only when **both** sides at a
 * given key are plain objects (per {@link isPlainObject}: `typeof ===
 * 'object'`, non-null, NOT an array). Every other shape is replaced
 * wholesale by the override value:
 *  - Arrays are **replaced, not concatenated**. `base.tags = ['a','b']`
 *    + `override.tags = ['c']` → `['c']`, not `['a','b','c']`.
 *  - `null` on override **replaces** a non-null base value (intentional —
 *    `null` is how a YAML config explicitly nulls out an inherited
 *    field).
 *  - Mixed-shape keys (object on one side, scalar on the other) take
 *    the override side as-is rather than mixing them.
 *
 * Mutates a fresh `merged` object — `base` and `override` are not
 * modified. Safe for repeated calls in a chain (`works.yml` overrides
 * defaults, environment overrides `works.yml`).
 */
export function mergeConfigObjects<T = Record<string, unknown>>(
	base: Record<string, unknown>,
	override: Record<string, unknown>
): T {
	const merged: Record<string, unknown> = { ...base };

	for (const [key, value] of Object.entries(override)) {
		const existing = merged[key];
		merged[key] = isPlainObject(existing) && isPlainObject(value)
			? mergeConfigObjects(existing, value)
			: value;
	}

	return merged as T;
}
