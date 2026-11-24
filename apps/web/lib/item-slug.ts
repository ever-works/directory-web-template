/**
 * Longest slug an item URL can name. Filesystems (ext4, NTFS) cap a single path
 * segment at ~255 bytes, so a longer slug bubbles up as `ENAMETOOLONG` from the
 * git-CMS lookup instead of reading as "no such item". The item page and its
 * `.md` mirror reject anything longer up-front (see
 * `directory-traversal-defense.spec.ts`).
 */
export const MAX_ITEM_SLUG_LENGTH = 255;

/**
 * Whether `slug` has the form of an item slug (letters, digits, `-`, `_`), as
 * `fetchItem` requires. Kept out of `lib/content.ts`: that is a "use server"
 * module, which may export async functions only.
 */
export function isItemSlug(slug: string): boolean {
	return /^[a-zA-Z0-9_-]+$/.test(slug);
}
