import { z } from 'zod';

/** Allowed location privacy values */
export const locationPrivacyValues = ['private', 'city', 'exact'] as const;
export const locationPrivacySchema = z.enum(locationPrivacyValues);

export type LocationPrivacy = z.infer<typeof locationPrivacySchema>;

/**
 * Schema for updating user profile location settings.
 * Both latitude and longitude must be provided together, or both must be null.
 */
export const updateLocationSchema = z
	.object({
		defaultLatitude: z.number().min(-90).max(90).nullable().optional(),
		defaultLongitude: z.number().min(-180).max(180).nullable().optional(),
		defaultCity: z.string().max(200).nullable().optional(),
		defaultCountry: z.string().max(100).nullable().optional(),
		locationPrivacy: locationPrivacySchema.optional(),
	})
	.refine(
		(data) => {
			const hasLat = data.defaultLatitude != null;
			const hasLng = data.defaultLongitude != null;
			return hasLat === hasLng;
		},
		{ message: 'Both latitude and longitude must be provided together' }
	);

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
