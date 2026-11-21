/**
 * Pure helpers for page titles and meta descriptions built from directory
 * data (Spec 062). No runtime imports, so the unit tests load them directly.
 *
 * Rules: descriptions come from the record's own text, are stripped of
 * Markdown / HTML noise, and are cut on a word boundary near 155 characters
 * (Google's snippet width). Nothing is invented: a record without text gets a
 * factual sentence made from its name, counts and site name.
 */

/** Target length of a meta description (Google truncates around 155-160 characters). */
export const META_DESCRIPTION_MAX = 155;

/** Plain text of a short Markdown / HTML fragment, whitespace collapsed. */
export function plainText(value: unknown): string {
	if (typeof value !== 'string') return '';
	return (
		value
			// HTML tags (tag-shaped only: "a < b" survives)
			.replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
			// images, then links (keep the link text)
			.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
			.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
			// heading / blockquote markers at a line start
			.replace(/^\s{0,3}(?:#{1,6}|>)\s+/gm, '')
			// bold / code markers, then single-character emphasis around a word
			// ("C#", "snake_case" and "a * b" are left alone)
			.replace(/\*\*|__|`/g, '')
			.replace(/(^|\s)[*_](?=\S)/g, '$1')
			.replace(/(\S)[*_](?=\s|$|[.,;:!?)])/g, '$1')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

/**
 * `value` as a meta description: plain text, at most `max` characters, cut at
 * the last word boundary with an ellipsis when it had to be shortened.
 */
export function toMetaDescription(value: unknown, max: number = META_DESCRIPTION_MAX): string {
	const textValue = plainText(value);
	if (textValue.length <= max) return textValue;
	const slice = textValue.slice(0, max - 1);
	const lastSpace = slice.lastIndexOf(' ');
	const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
	return `${cut.replace(/[\s,;:.!?\-–—]+$/u, '')}…`;
}

/** First non-blank candidate as a meta description. */
export function firstDescription(...candidates: unknown[]): string {
	for (const candidate of candidates) {
		const description = toMetaDescription(candidate);
		if (description) return description;
	}
	return '';
}

/** Names joined as "A, B and C" (at most `max`, then "and more"). */
export function listNames(names: ReadonlyArray<string>, max = 3): string {
	const clean = names.map((name) => plainText(name)).filter(Boolean);
	if (clean.length === 0) return '';
	const shown = clean.slice(0, max);
	if (clean.length > max) return `${shown.join(', ')} and more`;
	if (shown.length === 1) return shown[0];
	return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

export interface TaxonomyMetaInput {
	/** Display name of the category / tag. */
	name: string;
	/** Plural noun of the directory (`items_name`, e.g. "Tools"). */
	itemsName: string;
	count: number;
	siteName: string;
	/** The record's own description, when categories.yml / tags.yml has one. */
	description?: unknown;
	/** Names of the first listed items, to make a generated description specific. */
	sampleNames?: ReadonlyArray<string>;
}

/** `<Category> <Items> (N)` — e.g. "Time Tracking Tools (42)". */
export function taxonomyTitle({ name, itemsName, count }: Pick<TaxonomyMetaInput, 'name' | 'itemsName' | 'count'>): string {
	const noun = plainText(itemsName) || 'Items';
	const label = plainText(name);
	// "Tools Tools" when the category is already named after the noun.
	const base = label.toLowerCase().endsWith(noun.toLowerCase()) ? label : `${label} ${noun}`;
	return `${base} (${count})`;
}

/** The record's own description, else "Browse N <items> in <name> on <site>: A, B and C." */
export function taxonomyDescription(input: TaxonomyMetaInput): string {
	const own = toMetaDescription(input.description);
	if (own) return own;
	const noun = (plainText(input.itemsName) || 'Items').toLowerCase();
	const sample = listNames(input.sampleNames ?? []);
	return toMetaDescription(
		`Browse ${input.count} ${noun} in ${plainText(input.name)} on ${plainText(input.siteName)}${sample ? `: ${sample}` : ''}.`
	);
}

export interface ItemMetaInput {
	name: string;
	category?: string | null;
	siteName: string;
	description?: unknown;
}

/** `<Item> – <Category>` (the layout's template or the caller appends the site name). */
export function itemTitle({ name, category }: Pick<ItemMetaInput, 'name' | 'category'>): string {
	const label = plainText(name);
	const categoryLabel = plainText(category ?? '');
	return categoryLabel && categoryLabel.toLowerCase() !== label.toLowerCase() ? `${label} – ${categoryLabel}` : label;
}

/** The item's own description, else a factual sentence from its name, category and site. */
export function itemDescription({ name, category, siteName, description }: ItemMetaInput): string {
	const own = toMetaDescription(description);
	if (own) return own;
	const categoryLabel = plainText(category ?? '');
	return toMetaDescription(
		`Details and links for ${plainText(name)}${categoryLabel ? `, listed in ${categoryLabel}` : ''} on ${plainText(siteName)}.`
	);
}
