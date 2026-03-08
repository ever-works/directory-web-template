import { z } from 'zod';

/**
 * Schema for dashboard stats query parameters (currently no params needed)
 * Reserved for future filtering options like date range
 */
export const dashboardStatsQuerySchema = z.object({
    // Future: Add date range filters if needed
    // startDate: z.string().datetime().optional(),
    // endDate: z.string().datetime().optional(),
});

// Inferred types
export type DashboardStatsQueryInput = z.infer<typeof dashboardStatsQuerySchema>;
