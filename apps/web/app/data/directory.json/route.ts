import { loadAgentDataset } from '@/lib/agent-access/server';
import { agentJson, agentPreflight } from '@/lib/agent-access/http';

/**
 * `GET /data/directory.json` — Agent Access Contract v1 `DirectoryInfo`
 * (docs/spec/062-agent-access/spec.md).
 *
 * Rendered per request (CDN-cached via `s-maxage`) rather than prerendered:
 * the image is built without NEXT_PUBLIC_APP_URL, so a prerendered copy would
 * name the fallback origin (same reason as app/robots.ts).
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
	const dataset = await loadAgentDataset();
	return agentJson(dataset.info);
}

export function OPTIONS(): Response {
	return agentPreflight();
}
