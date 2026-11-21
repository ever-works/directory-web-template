import { loadAgentDataset } from '@/lib/agent-access/server';
import { itemsDocument } from '@/lib/agent-access/dataset';
import { agentJson, agentPreflight } from '@/lib/agent-access/http';

/**
 * `GET /data/items.json` — every item as an `ItemSummary`
 * (Agent Access Contract v1, docs/spec/062-agent-access/spec.md).
 * The legacy `/items.json` keeps its own shape.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
	const dataset = await loadAgentDataset();
	return agentJson(itemsDocument(dataset.items));
}

export function OPTIONS(): Response {
	return agentPreflight();
}
