import { NextResponse, type NextRequest } from 'next/server';

/**
 * Test-only OpenAI-compatible chat completions mock (Spec 023, T-013b).
 *
 * Gated by `E2E_ALLOW_TEST_OVERRIDES=true` AND `NODE_ENV !== production`
 * so it never serves anything in a real deployment. When inactive, it
 * returns 404 (same shape as a missing route).
 *
 * Set `AI_CHAT_BASE_URL=http://localhost:3000/api/__test__/openai-mock`
 * for e2e runs and the OpenAI-compatible SDK will POST here instead of
 * a real upstream. The response is a canned SSE stream that includes
 * a markdown-formatted reply so the markdown renderer (T-005a) can be
 * exercised under test.
 */

export const runtime = 'nodejs';

function isActive(): boolean {
	return process.env.E2E_ALLOW_TEST_OVERRIDES === 'true' && process.env.NODE_ENV !== 'production';
}

interface UpstreamMessage {
	role: string;
	content: string | Array<{ text?: string }>;
}

interface UpstreamBody {
	messages?: UpstreamMessage[];
}

function extractLastUserText(body: UpstreamBody): string {
	const messages = Array.isArray(body.messages) ? body.messages : [];
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i];
		if (m.role !== 'user') continue;
		if (typeof m.content === 'string') return m.content;
		if (Array.isArray(m.content)) {
			return m.content
				.map((p) => p.text ?? '')
				.join(' ')
				.trim();
		}
	}
	return '';
}

function sseChunk(payload: object): string {
	return `data: ${JSON.stringify(payload)}\n\n`;
}

function buildCannedReply(userText: string): string[] {
	const lower = userText.toLowerCase();
	if (lower.includes('error-please')) {
		return ['__ERROR__'];
	}
	if (lower.includes('markdown')) {
		return ['Here is **bold**, ', '`code`, and a list:\n', '- one\n- two\n', 'Done.'];
	}
	return ['Hello from the ', '**mock**. ', `You said: "${userText.slice(0, 80)}".`];
}

export async function POST(request: NextRequest) {
	if (!isActive()) {
		return NextResponse.json({ error: 'not-found' }, { status: 404 });
	}

	let parsed: UpstreamBody;
	try {
		parsed = (await request.json()) as UpstreamBody;
	} catch {
		parsed = {};
	}
	const userText = extractLastUserText(parsed);
	const chunks = buildCannedReply(userText);

	if (chunks[0] === '__ERROR__') {
		return NextResponse.json({ error: { message: 'mock-error' } }, { status: 500 });
	}

	const id = `mock-${Date.now()}`;
	const created = Math.floor(Date.now() / 1000);
	const model = 'mock-model';
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			controller.enqueue(
				encoder.encode(
					sseChunk({
						id,
						object: 'chat.completion.chunk',
						created,
						model,
						choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }]
					})
				)
			);
			for (const chunk of chunks) {
				controller.enqueue(
					encoder.encode(
						sseChunk({
							id,
							object: 'chat.completion.chunk',
							created,
							model,
							choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
						})
					)
				);
				await new Promise((r) => setTimeout(r, 10));
			}
			controller.enqueue(
				encoder.encode(
					sseChunk({
						id,
						object: 'chat.completion.chunk',
						created,
						model,
						choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
					})
				)
			);
			controller.enqueue(encoder.encode('data: [DONE]\n\n'));
			controller.close();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive'
		}
	});
}
