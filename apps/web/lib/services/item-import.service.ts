import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { ItemRepository } from '@/lib/repositories/item.repository';
import {
	importRowSchema,
	importRowDataSchema,
	IMPORT_SLUG_MESSAGE,
	IMPORT_SLUG_PATTERN,
	type ImportRowData,
} from '@/lib/validations/item-import';
import { slugify } from '@/lib/utils/slug';
import { normalizeSourceUrl } from '@/lib/utils/source-url';
import type { CreateItemRequest } from '@/lib/types/item';
import type {
	ImportRowRaw,
	ImportRowValidation,
	ColumnMapping,
	ImportResult,
	ImportDuplicateStrategy,
	ItemExportData,
} from '@/lib/types/item-import-export';


/**
 * Maximum items per batch import.
 *
 * DoS bound — admins uploading a 50k-row CSV would otherwise pin the
 * Git-CMS writer for minutes. 500 fits comfortably in a single
 * commit and keeps the worst-case batch wall-time tolerable. If
 * a customer needs higher caps, run multiple batches sequentially
 * rather than raising this constant.
 */
const MAX_IMPORT_BATCH = 500;

/**
 * The `'` the CSV export puts before a cell starting with `=`, `+`, `-`, `@`, tab, CR or LF
 * (`CSV_FORMULA_PREFIX` in lib/utils/csv-formula.ts). A value
 * that already started with `'` before such a character was exported with one more `'`, so one
 * apostrophe is removed from any run of them that ends in one of those characters.
 */
const ESCAPED_FORMULA_APOSTROPHE = /^'(?='*[=+\-@\t\r\n])/;

/**
 * Known field aliases for auto-detecting column mapping.
 *
 * **Matching is case-insensitive and exact (after trim)** —
 * `Item Name`, `ITEM NAME`, and `item name` all map to `name` but
 * `itemName` (camelCase, no separator) does NOT. Add new aliases
 * here when users complain about a CSV header that "should have
 * been obvious".
 *
 * **Duplicate `source_url` entry** in the list is intentional /
 * harmless — Set-like lookup downstream collapses it.
 *
 * **`category` aliases include `categories`** even though category
 * vs categories has different multi-value semantics. Imports map
 * either form to the single `category` column; the downstream
 * `column-mapping.ts` resolver handles split-by-semicolon for the
 * `categories` plural case.
 */
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

/**
 * The comparison keys ({@link normalizeSourceUrl}) of the items' links, so a row is matched the way
 * POST /api/client/items matches a submission: `www.`, a trailing slash, http vs https, a fragment
 * or tracking parameters do not make a link new.
 */
function sourceUrlKeys(items: ReadonlyArray<{ source_url?: string | null }>): Set<string> {
	const keys = new Set<string>();
	for (const item of items) {
		const key = normalizeSourceUrl(item.source_url);
		if (key) keys.add(key);
	}
	return keys;
}

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
	 *
	 * `ItemExportService.exportToCSV` prefixes a cell that starts with `=`, `+`, `-`, `@`, tab, CR or
	 * LF with `'` so spreadsheet apps do not run it as a formula. The transform removes that one
	 * apostrophe, so an exported file imports back with the original values.
	 */
	parseCSV(content: string): ParsedFile {
		const result = Papa.parse<ImportRowRaw>(content, {
			header: true,
			skipEmptyLines: true,
			transformHeader: (header: string) => header.trim(),
			transform: (value: string) => value.replace(ESCAPED_FORMULA_APOSTROPHE, ''),
		});

		return {
			headers: result.meta.fields || [],
			rows: result.data,
		};
	}

	/**
	 * Parse an XLSX buffer into headers and rows.
	 */
	async parseXLSX(buffer: Buffer): Promise<ParsedFile> {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);

		const sheet = workbook.worksheets[0];
		if (!sheet || sheet.rowCount === 0) {
			return { headers: [], rows: [] };
		}

		const headerRow = sheet.getRow(1);
		const headers: string[] = [];
		headerRow.eachCell((cell, colNumber) => {
			headers[colNumber - 1] = String(cell.value || '');
		});

		const rows: ImportRowRaw[] = [];
		for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
			const row = sheet.getRow(rowIdx);
			const rowData: ImportRowRaw = {};
			let hasData = false;

			headers.forEach((header, colIdx) => {
				const cell = row.getCell(colIdx + 1);
				const value = cell.value != null ? String(cell.value) : '';
				rowData[header] = value;
				if (value) hasData = true;
			});

			if (hasData) {
				rows.push(rowData);
			}
		}

		return { headers, rows };
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
		// Deleted items still have their YAML file, so they count as duplicates too (as in executeImport).
		const existingItems = await this.repository.findAll({ includeDeleted: true });
		const existingSlugs = new Set(existingItems.map((item) => item.slug));
		const existingUrls = sourceUrlKeys(existingItems);

		// Track slugs created within this batch to avoid intra-batch collisions
		const batchSlugs = new Set<string>();
		// Links of earlier rows: a later row with the same link is a duplicate (executeImport skips it)
		const batchUrls = new Set<string>();

		let validationResults: ImportRowValidation[] = [];
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
				batchUrls,
				duplicateStrategy: options.duplicateStrategy,
				defaultStatus: options.defaultStatus,
			});

			if (result.valid && result.data?.slug) {
				batchSlugs.add(result.data.slug);
			}
			// Only a row the import will write claims its link (as in executeImport): a row skipped as a
			// duplicate leaves a free link to a later row.
			const writes =
				result.valid &&
				(!result.duplicate || (!!result.duplicate.slug && options.duplicateStrategy === 'update'));
			const urlKey = writes ? normalizeSourceUrl(result.data?.source_url) : null;
			if (urlKey) batchUrls.add(urlKey);

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
	 *
	 * The rows come back from the browser, so their `valid` / `duplicate` flags and their data are
	 * not trusted: every row is checked again against {@link importRowDataSchema}, and duplicates
	 * are looked up again among all items (deleted ones included) by slug and by source_url, links
	 * compared with {@link normalizeSourceUrl} as the single submit does. A row whose link an earlier
	 * row of the same import creates or updates is skipped too (a skipped row claims no link). A row
	 * whose slug already exists never reaches `batchCreate`: it is skipped, or updated when the
	 * strategy is 'update' (the update does not check the link). `clientMode` (the
	 * client import route) never updates an existing item, forces `featured` to false and drops
	 * `collections`, `brand_logo_url` and `images`, which the client submit form cannot set either.
	 */
	async executeImport(
		validatedRows: ImportRowValidation[],
		options: {
			duplicateStrategy: ImportDuplicateStrategy;
			defaultStatus: 'draft' | 'pending' | 'approved';
			submittedBy?: string;
			clientMode?: boolean;
		}
	): Promise<ImportResult> {
		const clientMode = options.clientMode === true;
		const duplicateStrategy: ImportDuplicateStrategy = clientMode ? 'skip' : options.duplicateStrategy;

		const existingItems = await this.repository.findAll({ includeDeleted: true });
		const existingBySlug = new Map(existingItems.map((item) => [item.slug, item]));
		const existingUrls = sourceUrlKeys(existingItems);
		const batchSlugs = new Set<string>();
		const batchUrls = new Set<string>();

		const rowsToCreate: Array<{ rowIndex: number; data: ImportRowData }> = [];
		const rowsToUpdate: Array<{ rowIndex: number; id: string; data: ImportRowData }> = [];
		const invalidRows: ImportResult['errors'] = [];
		let skippedCount = 0;

		for (const row of validatedRows) {
			const checked = this.recheckRow(row, clientMode);
			if (!checked.ok) {
				invalidRows.push({ rowIndex: checked.rowIndex, message: checked.message });
				continue;
			}
			const { rowIndex, data } = checked;

			if (batchSlugs.has(data.slug)) {
				invalidRows.push({ rowIndex, message: `slug: "${data.slug}" appears more than once in this import` });
				continue;
			}
			batchSlugs.add(data.slug);

			const urlKey = normalizeSourceUrl(data.source_url);
			const urlTaken = urlKey !== null && (existingUrls.has(urlKey) || batchUrls.has(urlKey));

			const existing = existingBySlug.get(data.slug);
			if (existing && duplicateStrategy === 'update') {
				rowsToUpdate.push({ rowIndex, id: existing.id, data });
			} else if (existing || urlTaken) {
				skippedCount++;
				// A skipped row does not claim its link, so a later row with that free link is still created.
				continue;
			} else {
				rowsToCreate.push({ rowIndex, data });
			}
			if (urlKey) batchUrls.add(urlKey);
		}

		const totalToProcess = rowsToCreate.length + rowsToUpdate.length;
		if (totalToProcess === 0) {
			return {
				total: validatedRows.length,
				created: 0,
				updated: 0,
				skipped: skippedCount,
				errors: invalidRows,
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

		for (const { data } of rowsToCreate) {
			createRequests.push({
				id: data.slug,
				name: data.name,
				slug: data.slug,
				description: data.description,
				source_url: data.source_url,
				category: data.category || [],
				tags: data.tags || [],
				collections: data.collections || [],
				featured: data.featured ?? false,
				icon_url: data.icon_url || undefined,
				status: options.defaultStatus,
				submitted_by: options.submittedBy || 'import',
				brand: data.brand || undefined,
				brand_logo_url: data.brand_logo_url || undefined,
				images: data.images || undefined,
			});
		}

		// Execute batch create
		if (createRequests.length > 0) {
			try {
				const created = await this.repository.batchCreate(
					createRequests,
					`Import ${createRequests.length} items`
				);
				createdCount = created.length;
				// batchCreate leaves out a row whose slug an overlapping import or submission took after the lookup above.
				skippedCount += createRequests.length - created.length;
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				errors.push({ rowIndex: -1, message: `Batch create failed: ${message}` });
			}
		}

		// Execute batch updates for duplicates with 'update' strategy
		if (rowsToUpdate.length > 0) {
			const updates: Array<{ id: string; data: import('@/lib/types/item').UpdateItemRequest }> = [];

			for (const { id, data } of rowsToUpdate) {
				updates.push({
					id,
					data: {
						id,
						name: data.name,
						description: data.description,
						source_url: data.source_url,
						category: data.category,
						tags: data.tags,
						collections: data.collections,
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

		// Include validation errors from invalid rows
		errors.push(...invalidRows);

		return {
			total: validatedRows.length,
			created: createdCount,
			updated: updatedCount,
			skipped: skippedCount,
			errors,
		};
	}

	/**
	 * Check one row of an execute request again on the server (see {@link executeImport}).
	 * A row without a slug gets one from its name, as in `validateSingleRow`.
	 */
	private recheckRow(
		row: ImportRowValidation,
		clientMode: boolean
	): { ok: true; rowIndex: number; data: ImportRowData } | { ok: false; rowIndex: number; message: string } {
		const rowIndex = typeof row?.rowIndex === 'number' ? row.rowIndex : -1;
		if (!row || row.valid !== true || !row.data || typeof row.data !== 'object') {
			const message = Array.isArray(row?.errors) ? row.errors.join('; ') : '';
			return { ok: false, rowIndex, message: message || 'Invalid row' };
		}

		const input = row.data as Record<string, unknown>;
		const parsed = importRowDataSchema.safeParse({
			...input,
			slug: input.slug || slugify(typeof input.name === 'string' ? input.name : ''),
		});
		if (!parsed.success) {
			const message = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
			return { ok: false, rowIndex, message };
		}

		if (!clientMode) return { ok: true, rowIndex, data: parsed.data };
		return {
			ok: true,
			rowIndex,
			data: { ...parsed.data, featured: false, collections: undefined, brand_logo_url: undefined, images: undefined },
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
			/** {@link normalizeSourceUrl} keys of the existing items' links. */
			existingUrls: Set<string>;
			batchSlugs: Set<string>;
			/** {@link normalizeSourceUrl} keys of the links of earlier valid rows. */
			batchUrls: Set<string>;
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
		// A slug made from the name can still hold characters the import refuses (e.g. `_`).
		if (!IMPORT_SLUG_PATTERN.test(slug)) {
			return {
				rowIndex,
				valid: false,
				errors: [`slug: "${slug}" (made from the name): ${IMPORT_SLUG_MESSAGE}. Add a slug for this row.`],
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
		// Links are compared as the single submit compares them, against existing items and earlier rows.
		const urlKey = normalizeSourceUrl(data.source_url);
		const duplicateUrl = urlKey && (context.existingUrls.has(urlKey) || context.batchUrls.has(urlKey))
			? data.source_url
			: undefined;

		const hasDuplicate = !!duplicateSlug || !!duplicateUrl;

		// executeImport updates only an item with the row's slug; a link-only duplicate is skipped.
		if (duplicateSlug && context.duplicateStrategy === 'update') {
			warnings.push('Duplicate detected — existing item will be updated');
		} else if (hasDuplicate) {
			warnings.push('Duplicate detected — will be skipped');
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
