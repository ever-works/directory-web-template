import { z } from 'zod';

/**
 * An absolute http or https URL, the only kind of link an item's `source_url` may hold.
 *
 * `z.string().url()` alone accepts any scheme the URL parser knows (`javascript:`, `data:`,
 * `file:` ...). `normalizeSourceUrl` (lib/utils/source-url.ts) returns null for those, so the
 * duplicate-link check never applied to them. Shared by the import row schemas
 * (lib/validations/item-import.ts) and both client item schemas (lib/validations/client-item.ts).
 */
export const httpUrlSchema = z.string().url({ protocol: /^https?$/, message: 'Invalid URL format' });
