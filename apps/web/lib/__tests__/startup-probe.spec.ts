import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { isStartupProbeRequest } from '../startup-probe';

/** Run with: `npx tsx --test apps/web/lib/__tests__/startup-probe.spec.ts` */
describe('isStartupProbeRequest', () => {
	it("matches Kubernetes' probe on the home page only", () => {
		assert.equal(isStartupProbeRequest('/', 'kube-probe/1.36'), true);
		assert.equal(isStartupProbeRequest('/de', 'kube-probe/1.36'), false);
		assert.equal(isStartupProbeRequest('/items/x', 'kube-probe/1.36'), false);
	});

	it('leaves visitors, crawlers and other monitors alone', () => {
		assert.equal(isStartupProbeRequest('/', 'Mozilla/5.0'), false);
		assert.equal(isStartupProbeRequest('/', 'Mozilla/5.0 (compatible; Googlebot/2.1)'), false);
		assert.equal(isStartupProbeRequest('/', 'UptimeRobot/2.0'), false);
		assert.equal(isStartupProbeRequest('/', null), false);
		assert.equal(isStartupProbeRequest('/', undefined), false);
	});

	it('runs first in the proxy, and the server warms the content at start-up', () => {
		const flat = (relative: string) => readFileSync(join(__dirname, '../..', relative), 'utf8').replace(/\s+/g, ' ');
		const proxy = flat('proxy.ts');
		const body = proxy.slice(proxy.indexOf('export default async function proxy('));
		assert.ok(
			body.indexOf("if (isStartupProbeRequest(originalPathname, req.headers.get('user-agent'))) {") <
				body.indexOf('adminApiEdgeGuard(req)'),
			'the probe check must come before any other proxy work'
		);
		const instrumentation = flat('instrumentation.ts');
		assert.ok(instrumentation.includes('warmContentInBackground();'));
		assert.ok(instrumentation.indexOf('warmContentInBackground();') < instrumentation.indexOf('await initializeDatabase()'));
	});
});
