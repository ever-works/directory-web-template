import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ItemRepository } from '@/lib/repositories/item.repository';
import type { ItemExportData } from '@/lib/types/item-import-export';
import { EXPORT_COLUMNS } from '@/lib/types/item-import-export';

interface CSVExportResult {
	data: string;
	filename: string;
	contentType: string;
}

interface XLSXExportResult {
	data: Buffer;
	filename: string;
	contentType: string;
}

interface ExportOptions {
	/** Only export approved, non-deleted items (for public export) */
	publicOnly?: boolean;
}

const SAMPLE_ROWS: Record<string, string>[] = [
	{
		name: 'Example App',
		description: 'An example application that demonstrates the import format.',
		source_url: 'https://example.com',
		category: 'Productivity',
		tags: 'time-tracking;productivity',
		slug: '',
		featured: 'false',
		brand: 'Example Corp',
		brand_logo_url: '',
		images: '',
		icon_url: 'https://example.com/icon.png',
		status: 'draft',
		collections: '',
		'location.address': '',
		'location.city': '',
		'location.state': '',
		'location.country': '',
		'location.postal_code': '',
		'location.latitude': '',
		'location.longitude': '',
		'location.service_area': '',
		'location.is_remote': '',
	},
	{
		name: 'Another Tool',
		description: 'Another tool showcasing multiple categories and tags separated by semicolons.',
		source_url: 'https://another-tool.com',
		category: 'Analytics;Reporting',
		tags: 'analytics;reports;dashboard',
		slug: 'another-tool',
		featured: 'true',
		brand: '',
		brand_logo_url: '',
		images: 'https://another-tool.com/img1.png;https://another-tool.com/img2.png',
		icon_url: '',
		status: 'approved',
		collections: 'best-tools',
		'location.address': '',
		'location.city': 'San Francisco',
		'location.state': 'CA',
		'location.country': 'US',
		'location.postal_code': '',
		'location.latitude': '',
		'location.longitude': '',
		'location.service_area': '',
		'location.is_remote': 'true',
	},
];

export class ItemExportService {
	private repository: ItemRepository;

	constructor(repository?: ItemRepository) {
		this.repository = repository || new ItemRepository();
	}

	/**
	 * Export items as CSV.
	 */
	async exportToCSV(options: ExportOptions = {}): Promise<CSVExportResult> {
		const rows = await this.getExportRows(options);
		const csv = Papa.unparse(rows, { columns: EXPORT_COLUMNS as unknown as string[] });
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

		return {
			data: csv,
			filename: `items-export-${timestamp}.csv`,
			contentType: 'text/csv; charset=utf-8',
		};
	}

	/**
	 * Export items as XLSX.
	 */
	async exportToXLSX(options: ExportOptions = {}): Promise<XLSXExportResult> {
		const rows = await this.getExportRows(options);
		const ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS as unknown as string[] });
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Items');
		const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

		return {
			data: Buffer.from(buffer),
			filename: `items-export-${timestamp}.xlsx`,
			contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		};
	}

	/**
	 * Generate a sample CSV template with headers and example rows.
	 */
	generateSampleCSV(): CSVExportResult {
		const csv = Papa.unparse(SAMPLE_ROWS, { columns: EXPORT_COLUMNS as unknown as string[] });

		return {
			data: csv,
			filename: 'items-import-template.csv',
			contentType: 'text/csv; charset=utf-8',
		};
	}

	/**
	 * Generate a sample XLSX template with headers and example rows.
	 */
	generateSampleXLSX(): XLSXExportResult {
		const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: EXPORT_COLUMNS as unknown as string[] });
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Items');
		const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

		return {
			data: Buffer.from(buffer),
			filename: 'items-import-template.xlsx',
			contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		};
	}

	/**
	 * Flatten ItemExportData into flat row objects for CSV/XLSX.
	 */
	private async getExportRows(options: ExportOptions): Promise<Record<string, string>[]> {
		const items = await this.repository.findAllRaw(false);

		let filtered = items;
		if (options.publicOnly) {
			filtered = items.filter((item) => item.status === 'approved' && !item.deleted_at);
		}

		return filtered.map((item) => this.flattenItem(item));
	}

	private flattenItem(item: ItemExportData): Record<string, string> {
		const categories = Array.isArray(item.category) ? item.category : [item.category].filter(Boolean);

		return {
			name: item.name,
			description: item.description,
			source_url: item.source_url,
			category: categories.join(';'),
			tags: (item.tags || []).join(';'),
			slug: item.slug,
			featured: item.featured ? 'true' : 'false',
			brand: item.brand || '',
			brand_logo_url: item.brand_logo_url || '',
			images: (item.images || []).join(';'),
			icon_url: item.icon_url || '',
			status: item.status,
			collections: (item.collections || []).join(';'),
			'location.address': item.location?.address || '',
			'location.city': item.location?.city || '',
			'location.state': item.location?.state || '',
			'location.country': item.location?.country || '',
			'location.postal_code': item.location?.postal_code || '',
			'location.latitude': item.location?.latitude != null ? String(item.location.latitude) : '',
			'location.longitude': item.location?.longitude != null ? String(item.location.longitude) : '',
			'location.service_area': item.location?.service_area || '',
			'location.is_remote': item.location?.is_remote ? 'true' : '',
		};
	}
}
