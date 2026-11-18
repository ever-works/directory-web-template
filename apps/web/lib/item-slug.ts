/**
 * Whether `slug` has the form of an item slug (letters, digits, `-`, `_`), as
 * `fetchItem` requires. Kept out of `lib/content.ts`: that is a "use server"
 * module, which may export async functions only.
 */
export function isItemSlug(slug: string): boolean {
	return /^[a-zA-Z0-9_-]+$/.test(slug);
}
