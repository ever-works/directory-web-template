import { z } from 'zod';

/** Allowed skill category values. Must stay in sync with the editor on the basic-info page. */
export const skillCategoryValues = ['Frontend', 'Backend', 'Tools & Frameworks', 'Other'] as const;
export const skillCategorySchema = z.enum(skillCategoryValues);
export type SkillCategory = z.infer<typeof skillCategorySchema>;

export const skillSchema = z.object({
	name: z.string().trim().min(1, 'SKILL_NAME_REQUIRED').max(100),
	category: skillCategorySchema,
	proficiency: z.number().int().min(0).max(100)
});
export type SkillInput = z.infer<typeof skillSchema>;

/**
 * Maximum size of the avatar data URL accepted by the API.
 * 2 MB raw file → roughly 2.7 MB base64. We allow a little headroom.
 */
export const AVATAR_DATA_URL_MAX_LENGTH = 3 * 1024 * 1024;

/** Optional empty-string-tolerant URL field. */
const optionalUrl = z.union([z.literal(''), z.string().url()]).nullable().optional();

const dataUrlSchema = z
	.string()
	.startsWith('data:image/', { message: 'Avatar must be an image data URL' })
	.max(AVATAR_DATA_URL_MAX_LENGTH, { message: 'Avatar exceeds maximum size' });

/** Schema for `PATCH /api/user/profile`. All fields optional. */
export const updateProfileSchema = z.object({
	displayName: z.string().trim().min(1).max(100).optional(),
	username: z.string().trim().min(3).max(50).optional(),
	bio: z.string().max(500).nullable().optional(),
	jobTitle: z.string().max(100).nullable().optional(),
	company: z.string().max(100).nullable().optional(),
	location: z.string().max(100).nullable().optional(),
	website: optionalUrl,
	interests: z.string().max(200).nullable().optional(),
	skills: z.array(skillSchema).max(50).nullable().optional(),
	avatar: z.union([dataUrlSchema, z.literal(''), z.null()]).optional()
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Schema for portfolio project create/update. */
export const portfolioProjectSchema = z.object({
	title: z.string().trim().min(1).max(150),
	description: z.string().trim().min(1).max(2000),
	imageUrl: z.string().url(),
	externalUrl: z.string().url(),
	tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
	isFeatured: z.boolean().default(false),
	position: z.number().int().min(0).default(0).optional()
});
export type PortfolioProjectInput = z.infer<typeof portfolioProjectSchema>;

/** Schema for `PATCH /api/user/profile/portfolio/[id]`. All fields optional. */
export const updatePortfolioProjectSchema = portfolioProjectSchema.partial();
export type UpdatePortfolioProjectInput = z.infer<typeof updatePortfolioProjectSchema>;
