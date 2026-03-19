import { z } from 'zod';

/**
 * Zod schema for item location data validation.
 * All fields are optional — validation strictness is driven by location settings
 * (e.g. requireLocationOnSubmit) at the form level.
 */
export const locationSchema = z.object({
	address: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	country: z.string().optional(),
	postal_code: z.string().optional(),
	latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional(),
	longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional(),
	service_area: z.enum(['local', 'regional', 'national', 'global']).optional(),
	is_remote: z.boolean().optional(),
	geocoded_by: z.enum(['mapbox', 'google']).optional(),
}).optional();

export type LocationSchemaInput = z.infer<typeof locationSchema>;
