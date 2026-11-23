import { loadAgentDataset } from '@/lib/agent-access/server';
import { agentJson, agentNotFound, agentPreflight, slugFromJsonSegment } from '@/lib/agent-access/http';

/**
 * `GET /data/items/{slug}.json` — one item as an `ItemDetail`, with its
 * Markdown body and related slugs (Agent Access Contract v1,
 * docs/spec/062-agent-access/spec.md).
 *
 * The segment is the whole `{slug}.json` file name: the route answers 404 for
 * anything that does not end in `.json` or names no item.
 */
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }): Promise<Response> {
	const { file } = await params;
	const slug = slugFromJsonSegment(file);
	if (!slug) return agentNotFound('Expected /data/items/{slug}.json.');
	const dataset = await loadAgentDataset();
	const item = await dataset.getItem(slug);
	if (!item) return agentNotFound(`No item with slug "${slug}".`);
	return agentJson(item);
}

export function OPTIONS(): Response {
	return agentPreflight();
}
