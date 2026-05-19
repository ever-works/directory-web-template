import { test, expect } from '@playwright/test';

// Crawler-discovery probes — agents.json, ai.txt, humans.txt, security.txt.

const DISCOVERY_PATHS = [
	'/.well-known/security.txt',
	'/security.txt',
	'/humans.txt',
	'/ai.txt',
	'/agents.json',
	'/agents.txt',
	'/.ai/agents.json'
];

test.describe('Agent / crawler discovery files non-5xx', () => {
	for (const path of DISCOVERY_PATHS) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
