'use server';

import 'server-only';
import yaml from 'yaml';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL as CONTENT_CACHE_TTL } from './cache-config';
import { dirExists, fsExists, getContentPath } from './lib';

export interface ContentSignals {
	hasCategories: boolean;
	hasTags: boolean;
	hasCollections: boolean;
	hasComparisons: boolean;
	hasPosts: boolean;
}

/**
 * Directories searched for blog posts, in priority order, relative to the
 * content root. Kept in sync with `POSTS_DIR_CANDIDATES` in `lib/content.ts`.
 */
const POSTS_DIR_CANDIDATES = [['posts'], ['blog', 'posts'], ['blog']] as const;

async function readCollectionExists(type: 'categories' | 'tags' | 'collections'): Promise<boolean> {
	const filePath = path.join(getContentPath(), `${type}.yml`);
	if (!(await fsExists(filePath))) {
		return false;
	}

	try {
		const raw = await fsp.readFile(filePath, 'utf8');
		const parsed = yaml.parse(raw);
		return Array.isArray(parsed) && parsed.length > 0;
	} catch (error) {
		console.error(`[CONTENT] Failed to read ${type} existence:`, error);
		return false;
	}
}

async function readComparisonsExists(): Promise<boolean> {
	const comparisonsDir = path.join(getContentPath(), 'comparisons');
	if (!(await dirExists(comparisonsDir))) {
		return false;
	}

	try {
		const entries = await fsp.readdir(comparisonsDir, { withFileTypes: true });
		return entries.some((entry) => entry.isDirectory());
	} catch (error) {
		console.error('[CONTENT] Failed to read comparisons existence:', error);
		return false;
	}
}

/**
 * True when the data repository ships at least one Markdown file under a
 * posts directory. Intentionally a cheap `readdir` rather than a full parse —
 * this only gates whether the Blog nav entry renders; the listing page does
 * the real filtering (drafts, locales) when someone actually visits it.
 */
async function readPostsExists(): Promise<boolean> {
	for (const segments of POSTS_DIR_CANDIDATES) {
		const postsDir = path.join(getContentPath(), ...segments);
		if (!(await dirExists(postsDir))) continue;

		try {
			const entries = await fsp.readdir(postsDir, { withFileTypes: true });
			if (entries.some((entry) => entry.isFile() && /\.mdx?$/i.test(entry.name))) {
				return true;
			}
		} catch (error) {
			console.error('[CONTENT] Failed to read posts existence:', error);
		}
	}

	return false;
}

async function fetchContentSignals(): Promise<ContentSignals> {
	const { ensureContentAvailable } = await import('./lib');
	await ensureContentAvailable();

	const [hasCategories, hasTags, hasCollections, hasComparisons, hasPosts] = await Promise.all([
		readCollectionExists('categories'),
		readCollectionExists('tags'),
		readCollectionExists('collections'),
		readComparisonsExists(),
		readPostsExists()
	]);

	return {
		hasCategories,
		hasTags,
		hasCollections,
		hasComparisons,
		hasPosts
	};
}

export const getCachedContentSignals = async (locale: string = 'en') => {
	return unstable_cache(
		async () => {
			return await fetchContentSignals();
		},
		['content-signals', locale],
		{
			revalidate: CONTENT_CACHE_TTL.CONTENT,
			tags: [
				CACHE_TAGS.CONTENT,
				CACHE_TAGS.CATEGORIES,
				CACHE_TAGS.TAGS,
				CACHE_TAGS.COLLECTIONS,
				CACHE_TAGS.COMPARISONS,
				CACHE_TAGS.POSTS,
				CACHE_TAGS.ITEMS_LOCALE(locale),
				CACHE_TAGS.COMPARISONS_LOCALE(locale),
				CACHE_TAGS.POSTS_LOCALE(locale)
			]
		}
	)();
};
