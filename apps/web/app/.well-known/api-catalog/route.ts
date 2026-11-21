import { loadAgentDataset } from '@/lib/agent-access/server';
import { API_CATALOG_CONTENT_TYPE, buildApiCatalog } from '@/lib/agent-access/discovery';
import { agentJson, agentPreflight } from '@/lib/agent-access/http';

/**
 * `GET /.well-known/api-catalog` — RFC 9727 API catalog (a linkset pointing at
 * the Read API's OpenAPI document and llms.txt). docs/spec/062-agent-access/spec.md.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
	const dataset = await loadAgentDataset();
	return agentJson(buildApiCatalog(dataset.info), { contentType: API_CATALOG_CONTENT_TYPE });
}

export function OPTIONS(): Response {
	return agentPreflight();
}
