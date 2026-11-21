import { loadAgentDataset } from '@/lib/agent-access/server';
import { buildOpenApiDocument } from '@/lib/agent-access/openapi';
import { agentJson, agentPreflight } from '@/lib/agent-access/http';

/**
 * `GET /data/openapi.json` — OpenAPI 3.1 of the Read API and `/mcp`
 * (docs/spec/062-agent-access/spec.md). Not `public/openapi.json`, which
 * documents the template's own `/api/*` server routes.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
	const dataset = await loadAgentDataset();
	return agentJson(buildOpenApiDocument(dataset.info), { contentType: 'application/openapi+json; charset=utf-8' });
}

export function OPTIONS(): Response {
	return agentPreflight();
}
