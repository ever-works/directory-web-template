/**
 * Convert a free-form string into a URL-safe slug.
 *
 * Pipeline (in order): lowercase → trim → collapse whitespace runs to `-` →
 * replace `&` with `-and-` → strip everything that's not a word char or hyphen
 * → collapse multiple consecutive hyphens → trim leading/trailing hyphens.
 *
 * Non-string or empty input returns `''` rather than throwing, so this is safe
 * to call on optional fields without an explicit guard at the call site.
 *
 * `deslugify(slugify(x))` is lossy for any character outside `[a-z0-9_-&]`
 * (spaces survive the round trip; accented letters and punctuation do not).
 *
 * @param text - The string to slugify.
 * @returns A URL-safe slug, or `''` if the input is empty or not a string.
 */
export function slugify(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Best-effort inverse of {@link slugify}.
 *
 * Replaces `-and-` with `&` (so slugs that round-tripped from text containing
 * `&` recover that character) and remaining `-` with spaces. This does NOT
 * restore casing, punctuation, or characters dropped by `slugify` — it's
 * intended for display fallback when a human-readable label is unavailable,
 * not for canonical round-tripping.
 *
 * @param slug - The slug to expand.
 * @returns The expanded text, or `''` if the input is empty or not a string.
 */
export function deslugify(slug: string): string {
  if (!slug || typeof slug !== "string") {
    return "";
  }
  return slug.replace(/-and-/g, "&").replace(/-/g, " ").trim();
}
