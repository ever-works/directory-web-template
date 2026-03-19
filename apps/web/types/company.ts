/**
 * Company type definitions
 * Frontend-specific Company type with serialized dates (as strings from API)
 */
import type { Company as DbCompany, NewCompany as DbNewCompany } from '@/lib/db/schema';

// Frontend Company type with dates as strings (from JSON serialization)
export type Company = Omit<DbCompany, 'createdAt' | 'updatedAt'> & {
	createdAt: string;
	updatedAt: string;
};

// Re-export NewCompany as-is
export type NewCompany = DbNewCompany;
