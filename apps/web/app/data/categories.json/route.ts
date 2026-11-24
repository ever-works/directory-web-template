import { loadAgentDataset } from '@/lib/agent-access/server';
import { categoriesDocument } from '@/lib/agent-access/dataset';
import { agentJson, agentPreflight } from '@/lib/agent-access/http';

/** `GET /data/categories.json` (Agent Access Contract v1, docs/spec/062-agent-access/spec.md). */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
	const dataset = await loadAgentDataset();
	return agentJson(categoriesDocument(dataset.categories));
}

export function OPTIONS(): Response {
	return agentPreflight();
}
