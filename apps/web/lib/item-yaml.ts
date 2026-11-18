import yaml from 'yaml';

import type { ItemData } from './content';
import { parseItemUpdatedAt } from './item-updated-at';

/**
 * An item's base YAML as `ItemData`, with `slug` set and `updatedAt` parsed. `parseItem` in
 * `content.ts` reads the file and catches what this throws: only YAML that does not parse, or
 * an empty file. A missing or unreadable `updated_at` leaves `updatedAt` undefined and
 * keeps the item (spec 061 R16).
 */
export function parseItemYaml(content: string, slug: string): ItemData {
	const meta = yaml.parse(content) as ItemData;
	meta.slug = slug;
	meta.updatedAt = parseItemUpdatedAt(meta.updated_at);
	if (typeof meta.updated_at !== 'string') delete meta.updated_at;
	delete meta.markdown;
	return meta;
}
