import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from './cache-config';
import { clearFetchItemsCache, fetchItems } from './content';
import { DEFAULT_LOCALE } from './constants';

/**
 * Check if error is a Next.js render phase restriction error
 * Uses multiple patterns to be resilient to error message changes
 * @param error - Error to check
 * @returns true if error is related to render phase restrictions
 */
function isRenderPhaseError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Check for multiple patterns to be more robust against Next.js changes:
  // - "during render": Current Next.js error message
  // - "render phase": Alternative phrasing
  // - "revalidate" + "render": Both keywords present
  // - "unsupported" + "render": Combination for unsupported during render
  return (
    message.includes('during render') ||
    message.includes('render phase') ||
    (message.includes('revalidate') && message.includes('render')) ||
    (message.includes('unsupported') && message.includes('render'))
  );
}

/**
 * Safely call revalidateTag with error handling
 * Catches errors when called during render phase and logs warning
 * @param tag - Cache tag to revalidate
 *
 * Note: In Next.js 16, revalidateTag requires a second argument (profile).
 * Using 'max' profile for stale-while-revalidate semantics (recommended).
 */
function safeRevalidateTag(tag: string): boolean {
  try {
    // Next.js 16: revalidateTag now requires a profile parameter
    // Using 'max' for stale-while-revalidate semantics (recommended)
    revalidateTag(tag, 'max');
    return true;
  } catch (error) {
    // revalidateTag throws error when called during render phase
    // This is expected when background sync runs during request handling
    // Cache will be invalidated on next sync outside of render phase
    if (error instanceof Error && isRenderPhaseError(error)) {
      console.warn(`[CACHE] Skipping cache invalidation during render phase (tag: ${tag})`);
      return false;
    } else {
      // Log unexpected errors for debugging before re-throwing
      console.error(`[CACHE] Unexpected error during cache invalidation (tag: ${tag}):`, error);
      throw error;
    }
  }
}

/**
 * Invalidates all content-related caches
 * Should be called after repository sync completes successfully
 *
 * @returns `false` when a tag could not be revalidated (render phase), so the
 *          caller knows the invalidation has to be repeated.
 */
export async function invalidateContentCaches(): Promise<boolean> {
  console.log('[CACHE] Invalidating all content caches after sync');

  // Invalidate all content-related cache tags
  // Using safe wrapper to handle render phase restrictions
  const results = [
    CACHE_TAGS.CONTENT,
    CACHE_TAGS.ITEMS,
    CACHE_TAGS.CATEGORIES,
    CACHE_TAGS.TAGS,
    CACHE_TAGS.COLLECTIONS,
    CACHE_TAGS.COMPARISONS,
    CACHE_TAGS.POSTS,
    CACHE_TAGS.PAGES
  ].map((tag) => safeRevalidateTag(tag));

  // Clear in-memory fetchItems cache
  await clearFetchItemsCache();

  // Swap in the new content in the background (Spec 061): re-walk the data directory
  // now (a stat per item; only changed files are re-parsed) so the first visitor after
  // a sync does not pay for it. Cached pages keep being served (stale-while-revalidate)
  // until they regenerate from this. Other locales rebuild from it in a few ms.
  void fetchItems({ lang: DEFAULT_LOCALE }).catch((error) =>
    console.warn('[CACHE] Background content warm-up failed:', error)
  );

  console.log('[CACHE] Content caches invalidated successfully');
  return results.every(Boolean);
}

/**
 * Invalidates cache for a specific item
 * @param slug - Item slug to invalidate
 */
export async function invalidateItemCache(slug: string): Promise<void> {
  console.log(`[CACHE] Invalidating cache for item: ${slug}`);
  safeRevalidateTag(CACHE_TAGS.ITEM(slug));
}

/**
 * Invalidates cache for a specific page
 * @param slug - Page slug to invalidate
 */
export async function invalidatePageCache(slug: string): Promise<void> {
  console.log(`[CACHE] Invalidating cache for page: ${slug}`);
  safeRevalidateTag(CACHE_TAGS.PAGE(slug));
}
