import { z } from 'zod';
import { ITEM_VALIDATION } from '@/lib/types/item';
import { httpUrlSchema } from './http-url';

/**
 * Slugs an import may write: lowercase letters and digits in groups joined by single hyphens.
 * The slug becomes the item's folder and file name in the data repository
 * (`data/<slug>/<slug>.yml`), so anything else (`../x`, `a/b`) is refused.
 */
export const IMPORT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const IMPORT_SLUG_MESSAGE = 'Slug may only contain lowercase letters, numbers and single hyphens';

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
	source_url: httpUrlSchema,
	category: z
		.string()
		.min(1, 'Category is required')
		.transform((val) => val.split(';').map((s) => s.trim()).filter(Boolean)),
	tags: z
		.string()
		.optional()
		.default('')
		.transform((val) => (val ? val.split(';').map((s) => s.trim()).filter(Boolean) : [])),
	slug: z.string().regex(IMPORT_SLUG_PATTERN, IMPORT_SLUG_MESSAGE).optional().or(z.literal('')),
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

const importedList = z.array(z.string()).optional();

/**
 * Server-side check of a row the browser sends back to the execute step
 * (`ImportRowValidation.data`, which `validateRows` has already split into arrays).
 * Reuses the name, description and URL rules of {@link importRowSchema}; the slug is required.
 */
export const importRowDataSchema = z.object({
	name: importRowSchema.shape.name,
	description: importRowSchema.shape.description,
	source_url: importRowSchema.shape.source_url,
	slug: z.string().regex(IMPORT_SLUG_PATTERN, IMPORT_SLUG_MESSAGE),
	category: importedList,
	tags: importedList,
	collections: importedList,
	featured: z.boolean().optional(),
	icon_url: importRowSchema.shape.icon_url,
	brand: z.string().optional(),
	brand_logo_url: importRowSchema.shape.brand_logo_url,
	images: importedList
});

export type ImportRowData = z.infer<typeof importRowDataSchema>;

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
