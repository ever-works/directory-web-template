import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ItemRepository } from '@/lib/repositories/item.repository';
import { importRowSchema } from '@/lib/validations/item-import';
import { slugify } from '@/lib/utils/slug';
import type { CreateItemRequest, ItemData } from '@/lib/types/item';
import type {
	ImportRowRaw,
	ImportRowValidation,
	ColumnMapping,
	ImportResult,
	ImportDuplicateStrategy,
	ItemExportData,
} from '@/lib/types/item-import-export';
import { ALL_IMPORTABLE_FIELDS } from '@/lib/types/item-import-export';

/** Maximum items per batch import */
const MAX_IMPORT_BATCH = 500;

/** Known field aliases for auto-detecting column mapping */
const FIELD_ALIASES: Record<string, string[]> = {
	name: ['name', 'title', 'item_name', 'item name'],
	description: ['description', 'desc', 'summary', 'about'],
	source_url: ['source_url', 'url', 'website', 'link', 'source url', 'source_url'],
	category: ['category', 'categories', 'cat', 'type'],
	tags: ['tags', 'tag', 'keywords', 'labels'],
	slug: ['slug', 'permalink', 'url_slug'],
	featured: ['featured', 'is_featured', 'highlight'],
	brand: ['brand', 'company', 'vendor', 'publisher'],
	brand_logo_url: ['brand_logo_url', 'brand_logo', 'company_logo', 'logo_url', 'logo'],
	images: ['images', 'image', 'screenshots', 'gallery'],
	icon_url: ['icon_url', 'icon', 'favicon', 'thumbnail'],
	status: ['status', 'state'],
	collections: ['collections', 'collection', 'groups'],
};

interface ParsedFile {
	headers: string[];
	rows: ImportRowRaw[];
}

interface ValidateOptions {
	columnMapping: ColumnMapping;
	duplicateStrategy: ImportDuplicateStrategy;
	defaultStatus: 'draft' | 'pending' | 'approved';
}

interface ValidateResult {
	headers: string[];
	suggestedMapping: ColumnMapping;
	validationResults: ImportRowValidation[];
	summary: {
		total: number;
		valid: number;
		errors: number;
		duplicates: number;
	};
}

export class ItemImportService {
	private repository: ItemRepository;

	constructor(repository?: ItemRepository) {
		this.repository = repository || new ItemRepository();
	}

	/**
	 * Parse a CSV string into headers and rows.
	 */
	parseCSV(content: string): ParsedFile {
		const result = Papa.parse<ImportRowRaw>(content, {
			header: true,
			skipEmptyLines: true,
			transformHeader: (header: string) => header.trim(),
		});

		return {
			headers: result.meta.fields || [],
			rows: result.data,
		};
	}

	/**
	 * Parse an XLSX buffer into headers and rows.
	 */
	parseXLSX(buffer: Buffer): ParsedFile {
		const workbook = XLSX.read(buffer, { type: 'buffer' });
		const sheetName = workbook.SheetNames[0];
		if (!sheetName) {
			return { headers: [], rows: [] };
		}

		const sheet = workbook.Sheets[sheetName];
		const jsonData = XLSX.utils.sheet_to_json<ImportRowRaw>(sheet, { defval: '' });

		const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

		return {
			headers,
			rows: jsonData,
		};
	}

	/**
	 * Auto-detect column mapping by matching headers to known field names.
	 */
	suggestColumnMapping(headers: string[]): ColumnMapping {
		const mapping: ColumnMapping = {};

		for (const header of headers) {
			const normalized = header.toLowerCase().trim();

			for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
				if (aliases.includes(normalized)) {
					mapping[header] = field;
					break;
				}
			}
		}

		return mapping;
	}

	/**
	 * Validate all rows against the import schema with duplicate detection.
	 */
	async validateRows(
		rows: ImportRowRaw[],
		options: ValidateOptions
	): Promise<ValidateResult> {
		const existingItems = await this.repository.findAll({ includeDeleted: false });
		const existingSlugs = new Set(existingItems.map((item) => item.slug));
		const existingUrls = new Set(existingItems.map((item) => item.source_url));

		// Track slugs created within this batch to avoid intra-batch collisions
		const batchSlugs = new Set<string>();

		const validationResults: ImportRowValidation[] = [];
		let validCount = 0;
		let errorCount = 0;
		let duplicateCount = 0;

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const mappedRow = this.applyMapping(row, options.columnMapping);
			const result = this.validateSingleRow(mappedRow, i, {
				existingSlugs,
				existingUrls,
				batchSlugs,
				duplicateStrategy: options.duplicateStrategy,
				defaultStatus: options.defaultStatus,
			});

			if (result.valid && result.data?.slug) {
				batchSlugs.add(result.data.slug);
			}

			if (result.valid) validCount++;
			else errorCount++;
			if (result.duplicate?.slug || result.duplicate?.source_url) duplicateCount++;

			validationResults.push(result);
		}

		return {
			headers: Object.keys(options.columnMapping).length > 0
				? Object.keys(options.columnMapping)
				: (rows.length > 0 ? Object.keys(rows[0]) : []),
			suggestedMapping: this.suggestColumnMapping(
				rows.length > 0 ? Object.keys(rows[0]) : []
			),
			validationResults,
			summary: {
				total: rows.length,
				valid: validCount,
				errors: errorCount,
				duplicates: duplicateCount,
			},
		};
	}

	/**
	 * Execute the import: write valid rows to git data repo and commit.
	 */
	async executeImport(
		validatedRows: ImportRowValidation[],
		options: {
			duplicateStrategy: ImportDuplicateStrategy;
			defaultStatus: 'draft' | 'pending' | 'approved';
			submittedBy?: string;
		}
	): Promise<ImportResult> {
		const rowsToCreate = validatedRows.filter((r) => r.valid && !r.duplicate?.slug);
		const rowsToUpdate = validatedRows.filter(
			(r) => r.valid && r.duplicate?.slug && options.duplicateStrategy === 'update'
		);
		const skipped = validatedRows.filter(
			(r) => !r.valid || (r.duplicate?.slug && options.duplicateStrategy === 'skip')
		);

		const totalToProcess = rowsToCreate.length + rowsToUpdate.length;
		if (totalToProcess === 0) {
			return {
				total: validatedRows.length,
				created: 0,
				updated: 0,
				skipped: skipped.length,
				errors: [],
			};
		}

		if (totalToProcess > MAX_IMPORT_BATCH) {
			return {
				total: validatedRows.length,
				created: 0,
				updated: 0,
				skipped: 0,
				errors: [{ rowIndex: -1, message: `Batch size exceeds maximum of ${MAX_IMPORT_BATCH} items` }],
			};
		}

		const errors: ImportResult['errors'] = [];
		let createdCount = 0;
		let updatedCount = 0;

		// Build create requests
		const createRequests: Array<CreateItemRequest & { brand?: string; brand_logo_url?: string; images?: string[]; markdown?: string }> = [];

		for (const row of rowsToCreate) {
			if (!row.data) continue;
			const data = row.data as Partial<ItemExportData>;
			const slug = data.slug || slugify(data.name || '');

			try {
				createRequests.push({
					id: slug,
					name: data.name || '',
					slug,
					description: data.description || '',
					source_url: data.source_url || '',
					category: data.category || [],
					tags: (data.tags as string[]) || [],
					collections: (data.collections as string[]) || [],
					featured: data.featured ?? false,
					icon_url: data.icon_url || undefined,
					status: options.defaultStatus,
					submitted_by: options.submittedBy || 'import',
					brand: data.brand || undefined,
					brand_logo_url: data.brand_logo_url || undefined,
					images: (data.images as string[]) || undefined,
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				errors.push({ rowIndex: row.rowIndex, message });
			}
		}

		// Execute batch create
		if (createRequests.length > 0) {
			try {
				const created = await this.repository.batchCreate(
					createRequests,
					`Import ${createRequests.length} items`
				);
				createdCount = created.length;
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				errors.push({ rowIndex: -1, message: `Batch create failed: ${message}` });
			}
		}

		// Execute batch updates for duplicates with 'update' strategy
		if (rowsToUpdate.length > 0) {
			const updates: Array<{ id: string; data: import('@/lib/types/item').UpdateItemRequest }> = [];

			for (const row of rowsToUpdate) {
				if (!row.data || !row.duplicate?.slug) continue;
				const data = row.data as Partial<ItemExportData>;

				updates.push({
					id: row.duplicate.slug,
					data: {
						id: row.duplicate.slug,
						name: data.name,
						description: data.description,
						source_url: data.source_url,
						category: data.category,
						tags: data.tags as string[],
						collections: data.collections as string[],
						featured: data.featured,
						icon_url: data.icon_url,
					},
				});
			}

			if (updates.length > 0) {
				try {
					const updated = await this.repository.batchUpdate(updates);
					updatedCount = updated.length;
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					errors.push({ rowIndex: -1, message: `Batch update failed: ${message}` });
				}
			}
		}

		return {
			total: validatedRows.length,
			created: createdCount,
			updated: updatedCount,
			skipped: skipped.length,
			errors,
		};
	}

	/**
	 * Apply column mapping to transform a raw row into mapped field names.
	 */
	private applyMapping(row: ImportRowRaw, mapping: ColumnMapping): ImportRowRaw {
		if (Object.keys(mapping).length === 0) return row;

		const mapped: ImportRowRaw = {};
		for (const [sourceCol, targetField] of Object.entries(mapping)) {
			if (targetField && targetField !== 'skip') {
				mapped[targetField] = row[sourceCol];
			}
		}
		return mapped;
	}

	/**
	 * Validate a single row against the import schema and check for duplicates.
	 */
	private validateSingleRow(
		mappedRow: ImportRowRaw,
		rowIndex: number,
		context: {
			existingSlugs: Set<string>;
			existingUrls: Set<string>;
			batchSlugs: Set<string>;
			duplicateStrategy: ImportDuplicateStrategy;
			defaultStatus: 'draft' | 'pending' | 'approved';
		}
	): ImportRowValidation {
		const parseResult = importRowSchema.safeParse(mappedRow);

		if (!parseResult.success) {
			const errors = parseResult.error.issues.map(
				(issue) => `${issue.path.join('.')}: ${issue.message}`
			);
			return {
				rowIndex,
				valid: false,
				errors,
				warnings: [],
			};
		}

		const data = parseResult.data;
		const warnings: string[] = [];

		// Generate slug if not provided
		let slug = data.slug || slugify(data.name);
		if (!slug) {
			return {
				rowIndex,
				valid: false,
				errors: ['Could not generate a valid slug from the name'],
				warnings: [],
			};
		}

		// Handle slug collisions within batch
		let slugSuffix = 2;
		let candidateSlug = slug;
		while (context.batchSlugs.has(candidateSlug)) {
			candidateSlug = `${slug}-${slugSuffix}`;
			slugSuffix++;
		}
		slug = candidateSlug;

		// Check for duplicate slug against existing items
		const duplicateSlug = context.existingSlugs.has(slug) ? slug : undefined;
		const duplicateUrl = data.source_url && context.existingUrls.has(data.source_url)
			? data.source_url
			: undefined;

		const hasDuplicate = !!duplicateSlug || !!duplicateUrl;

		if (hasDuplicate && context.duplicateStrategy === 'skip') {
			warnings.push('Duplicate detected — will be skipped');
		} else if (hasDuplicate && context.duplicateStrategy === 'update') {
			warnings.push('Duplicate detected — existing item will be updated');
		}

		// Override status with default
		const status = context.defaultStatus;

		return {
			rowIndex,
			valid: true,
			errors: [],
			warnings,
			data: {
				name: data.name,
				description: data.description,
				source_url: data.source_url,
				slug,
				category: data.category,
				tags: data.tags,
				collections: data.collections,
				featured: data.featured,
				icon_url: data.icon_url || undefined,
				brand: data.brand || undefined,
				brand_logo_url: data.brand_logo_url || undefined,
				images: data.images,
				status,
			} as Partial<ItemExportData>,
			duplicate: hasDuplicate
				? { slug: duplicateSlug, source_url: duplicateUrl }
				: undefined,
		};
	}
}
