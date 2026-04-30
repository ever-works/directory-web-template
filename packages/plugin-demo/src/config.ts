import { z } from 'zod';

export const ConfigSchema = z.object({
	enabled: z.boolean().default(true),
	greeting: z.string().default('Demo plugin loaded'),
});

export type DemoConfig = z.infer<typeof ConfigSchema>;
