import { handleMcpRequest } from '@/lib/agent-access/mcp';
import { loadAgentDataset } from '@/lib/agent-access/server';

/**
 * `/mcp` — stateless MCP server (Streamable HTTP, JSON responses) over the
 * directory content: `get_directory_info`, `search_items`, `list_items`,
 * `get_item`, `list_categories`, `list_tags`. No auth, no database.
 * See docs/spec/062-agent-access/spec.md and lib/agent-access/mcp.ts.
 *
 * `proxy.ts` excludes `/mcp` from its matcher, so the i18n middleware never
 * rewrites it to `/<locale>/mcp`.
 */
export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
	return handleMcpRequest(request, loadAgentDataset);
}

export function GET(request: Request): Promise<Response> {
	return handleMcpRequest(request, loadAgentDataset);
}

export function DELETE(request: Request): Promise<Response> {
	return handleMcpRequest(request, loadAgentDataset);
}

export function OPTIONS(request: Request): Promise<Response> {
	return handleMcpRequest(request, loadAgentDataset);
}
