export interface TocHeading {
	id: string;
	text: string;
	level: 2 | 3;
}

/**
 * Extracts h2 and h3 headings from a raw Markdown string.
 * Returns at most 12 headings — beyond that the ToC becomes unwieldy.
 *
 * ID generation mirrors the slugify pipeline so the IDs match the
 * rehypeAddIds plugin applied during MDX compilation.
 */
export function extractHeadings(markdown: string): TocHeading[] {
	if (!markdown) return [];

	const headingRegex = /^(#{2,3})\s+(.+)$/gm;
	const headings: TocHeading[] = [];
	let match: RegExpExecArray | null;

	while ((match = headingRegex.exec(markdown)) !== null && headings.length < 12) {
		const hashes = match[1];
		const rawText = match[2].trim().replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*_~]/g, '');
		const level = hashes.length === 2 ? 2 : 3;
		headings.push({ id: headingToId(rawText), text: rawText, level });
	}

	return headings;
}

/** Converts heading text to a DOM-safe id (mirrors slugify but without the & → -and- rule). */
function headingToId(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '')
		.replace(/-{2,}/g, '-')
		.replace(/^-+|-+$/g, '');
}
