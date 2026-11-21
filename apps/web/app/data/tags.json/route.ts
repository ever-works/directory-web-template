import { loadAgentDataset } from '@/lib/agent-access/server';
import { tagsDocument } from '@/lib/agent-access/dataset';
import { agentJson, agentPreflight } from '@/lib/agent-access/http';

/** `GET /data/tags.json`, most used tags first (Agent Access Contract v1, docs/spec/062-agent-access/spec.md). */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
	const dataset = await loadAgentDataset();
	return agentJson(tagsDocument(dataset.tags));
}

export function OPTIONS(): Response {
	return agentPreflight();
}
