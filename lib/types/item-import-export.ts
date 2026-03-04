import type { ItemData } from './item';

/**
 * Extended item data that includes YAML-only fields not present in ItemData.
 * Used for export to preserve all data from the YAML files.
 */
export interface ItemExportData extends ItemData {
	brand?: string;
	brand_logo_url?: string;
	images?: string[];
	markdown?: string;
}

/** Raw row from a parsed CSV/XLSX file before mapping */
export interface ImportRowRaw {
	[field: string]: string | undefined;
}

/** Validation result for a single import row */
export interface ImportRowValidation {
	rowIndex: number;
	valid: boolean;
	errors: string[];
	warnings: string[];
	data?: Partial<ItemExportData>;
	duplicate?: {
		slug?: string;
		source_url?: string;
	};
}

/** Column mapping from source file headers to target fields */
export interface ColumnMapping {
	[sourceColumn: string]: string;
}

/** Strategy for handling duplicate items during import */
export type ImportDuplicateStrategy = 'skip' | 'update';

/** Options for configuring an import operation */
export interface ImportOptions {
	duplicateStrategy: ImportDuplicateStrategy;
	defaultStatus: 'draft' | 'pending' | 'approved';
	columnMapping: ColumnMapping;
}

/** Result of an import operation */
export interface ImportResult {
	total: number;
	created: number;
	updated: number;
	skipped: number;
	errors: { rowIndex: number; message: string }[];
}

/** Fields available for import with required/optional classification */
export const IMPORTABLE_FIELDS = {
	required: ['name', 'description', 'source_url', 'category'] as const,
	optional: [
		'tags',
		'slug',
		'featured',
		'brand',
		'brand_logo_url',
		'images',
		'icon_url',
		'status',
		'collections',
	] as const,
} as const;

/** All importable field names */
export const ALL_IMPORTABLE_FIELDS = [...IMPORTABLE_FIELDS.required, ...IMPORTABLE_FIELDS.optional] as const;

/** Export column order for consistent output */
export const EXPORT_COLUMNS = [
	'name',
	'description',
	'source_url',
	'category',
	'tags',
	'slug',
	'featured',
	'brand',
	'brand_logo_url',
	'images',
	'icon_url',
	'status',
	'collections',
	'markdown',
	'location.address',
	'location.city',
	'location.state',
	'location.country',
	'location.postal_code',
	'location.latitude',
	'location.longitude',
	'location.service_area',
	'location.is_remote',
] as const;
