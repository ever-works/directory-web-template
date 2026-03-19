import { z } from 'zod';
import { ITEM_VALIDATION } from '@/lib/types/item';

/**
 * Schema for validating a single import row after column mapping.
 */
export const importRowSchema = z.object({
	name: z
		.string()
		.min(ITEM_VALIDATION.NAME_MIN_LENGTH, `Name must be at least ${ITEM_VALIDATION.NAME_MIN_LENGTH} characters`)
		.max(ITEM_VALIDATION.NAME_MAX_LENGTH, `Name must be at most ${ITEM_VALIDATION.NAME_MAX_LENGTH} characters`),
	description: z
		.string()
		.min(
			ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH,
			`Description must be at least ${ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH} characters`
		)
		.max(
			ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH,
			`Description must be at most ${ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`
		),
	source_url: z.string().url('Invalid URL format'),
	category: z
		.string()
		.min(1, 'Category is required')
		.transform((val) => val.split(';').map((s) => s.trim()).filter(Boolean)),
	tags: z
		.string()
		.optional()
		.default('')
		.transform((val) => (val ? val.split(';').map((s) => s.trim()).filter(Boolean) : [])),
	slug: z.string().optional(),
	featured: z
		.string()
		.optional()
		.transform((val) => val === 'true' || val === '1' || val === 'yes'),
	brand: z.string().optional(),
	brand_logo_url: z
		.string()
		.url('Invalid brand logo URL')
		.optional()
		.or(z.literal('')),
	images: z
		.string()
		.optional()
		.default('')
		.transform((val) => (val ? val.split(';').map((s) => s.trim()).filter(Boolean) : [])),
	icon_url: z
		.string()
		.url('Invalid icon URL')
		.optional()
		.or(z.literal('')),
	status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional(),
	collections: z
		.string()
		.optional()
		.default('')
		.transform((val) => (val ? val.split(';').map((s) => s.trim()).filter(Boolean) : [])),
});

export type ImportRowInput = z.infer<typeof importRowSchema>;

/**
 * Schema for the export query parameter.
 */
export const exportQuerySchema = z.object({
	format: z.enum(['csv', 'xlsx']).default('csv'),
});

/**
 * Schema for import options sent from the client.
 */
export const importOptionsSchema = z.object({
	duplicateStrategy: z.enum(['skip', 'update']).default('skip'),
	defaultStatus: z.enum(['draft', 'pending', 'approved']).default('draft'),
	columnMapping: z.record(z.string(), z.string()).default({}),
});

export type ImportOptionsInput = z.infer<typeof importOptionsSchema>;
