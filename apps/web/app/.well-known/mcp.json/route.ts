import { loadAgentDataset } from '@/lib/agent-access/server';
import { buildMcpServerCard } from '@/lib/agent-access/discovery';
import { agentJson, agentNotFound, agentPreflight } from '@/lib/agent-access/http';

/** `GET /.well-known/mcp.json` — MCP server card (docs/spec/062-agent-access/spec.md). */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
	const dataset = await loadAgentDataset();
	const card = buildMcpServerCard(dataset.info);
	return card ? agentJson(card) : agentNotFound('This directory serves no MCP endpoint.');
}

export function OPTIONS(): Response {
	return agentPreflight();
}
