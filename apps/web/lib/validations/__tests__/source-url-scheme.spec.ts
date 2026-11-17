import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clientCreateItemSchema, clientUpdateItemSchema } from '../client-item';
import { importRowDataSchema, importRowSchema } from '../item-import';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * An item's `source_url` was checked with `z.string().url()` alone, which accepts any scheme the
 * URL parser knows, so a CSV row or a client submission could store `javascript:alert(1)` or a
 * `data:` link. `normalizeSourceUrl` (lib/utils/source-url.ts) returns null for those, so the
 * duplicate-link check never applied to them either. The import row schemas and both client item
 * schemas now share one http(s)-only rule. See T-2610.
 */
const NOT_HTTP = [
	'javascript:alert(1)',
	'JavaScript:alert(document.cookie)',
	'data:text/html,<script>alert(1)</script>',
	'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
	'vbscript:msgbox(1)',
	'file:///etc/passwd',
	'ftp://files.example.com/tool.zip',
	'mailto:someone@example.com'
];
const HTTP = ['https://example.com/tool', 'http://example.com', 'https://www.example.com/tool/?ref=1#top'];

const importRow = (source_url: string) => ({
	name: 'New Tool',
	description: 'A brand new tool for the directory.',
	source_url,
	category: 'tools'
});
const importData = (source_url: string) => ({
	name: 'New Tool',
	description: 'A brand new tool for the directory.',
	source_url,
	slug: 'new-tool'
});
const clientItem = (source_url: string) => ({
	name: 'New Tool',
	description: 'A brand new tool for the directory.',
	source_url
});

const schemas = [
	{ name: 'importRowSchema (CSV preview)', parse: (url: string) => importRowSchema.safeParse(importRow(url)) },
	{
		name: 'importRowDataSchema (import execute)',
		parse: (url: string) => importRowDataSchema.safeParse(importData(url))
	},
	{
		name: 'clientCreateItemSchema (POST /api/client/items)',
		parse: (url: string) => clientCreateItemSchema.safeParse(clientItem(url))
	},
	{
		name: 'clientUpdateItemSchema (PUT /api/client/items/{id})',
		parse: (url: string) => clientUpdateItemSchema.safeParse({ source_url: url })
	}
];

describe('source_url accepts http(s) links only (T-2610)', () => {
	for (const schema of schemas) {
		it(`${schema.name} refuses javascript:, data: and other non-http links on source_url`, () => {
			for (const url of NOT_HTTP) {
				const result = schema.parse(url);
				assert.equal(result.success, false, `${url} was accepted`);
				assert.deepEqual(
					result.error?.issues.map((issue) => [issue.path.join('.'), issue.message]),
					[['source_url', 'Invalid URL format']],
					url
				);
			}
		});

		it(`${schema.name} still accepts http and https links`, () => {
			for (const url of HTTP) {
				const result = schema.parse(url);
				assert.equal(result.success, true, `${url}: ${JSON.stringify(result.error?.issues)}`);
			}
		});
	}

	it('clientUpdateItemSchema still lets a client leave source_url out', () => {
		assert.equal(clientUpdateItemSchema.safeParse({ name: 'Renamed Tool' }).success, true);
	});
});
