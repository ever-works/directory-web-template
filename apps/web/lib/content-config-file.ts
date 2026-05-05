import path from 'node:path';
import fs from 'node:fs/promises';

export const PRIMARY_CONTENT_CONFIG_FILENAME = 'works.yaml';
export const CONTENT_CONFIG_FILENAMES = [
	'works.yaml',
	'works.yml',
	'config.yaml',
	'config.yml'
] as const;

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
