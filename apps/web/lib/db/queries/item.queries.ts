/**
 * Item-related database utilities and mapping functions
 * Provides consistent handling of item identifiers across the system
 */

/**
 * Normalizes an item slug to ensure consistency across the system
 * @param slug - Raw slug input
 * @returns Normalized slug (lowercase, trimmed)
 */
export function normalizeItemSlug(slug: string): string {
	if (!slug || typeof slug !== 'string') {
		throw new Error('Item slug is required and must be a string');
	}

	const normalized = slug.toLowerCase().trim();

	if (!normalized) {
		throw new Error('Item slug cannot be empty');
	}

	// Validate slug format (alphanumeric, hyphens, underscores only)
	if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) {
		throw new Error(`Invalid slug format: ${slug}`);
	}

	return normalized;
}

/**
 * Maps item slug to itemId for database operations
 * In this system, itemId IS the normalized slug
 * @param slug - Item slug
 * @returns ItemId for database operations
 */
export function getItemIdFromSlug(slug: string): string {
	return normalizeItemSlug(slug);
}

/**
 * Validates if a slug exists in the content system
 * This is a placeholder for future content validation if needed
 * @param slug - Item slug to validate
 * @returns Promise<boolean> - True if slug exists
 */
export async function validateItemExists(slug: string): Promise<boolean> {
	// For now, we'll assume all normalized slugs are valid
	// This can be enhanced later to check against the actual content system
	try {
		normalizeItemSlug(slug);
		return true;
	} catch {
		return false;
	}
}
