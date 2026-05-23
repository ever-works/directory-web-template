import { test, expect } from '@playwright/test';

// Common scanner / attack-tool URL probes — must non-5xx and (ideally)
// 404. We accept any 4xx.

const ATTACK_PATHS = [
	'/.well-known/openid-configuration',
	'/.well-known/apple-developer-merchantid-domain-association',
	'/aws.yml',
	'/.aws/credentials',
	'/.dockercfg',
	'/.kube/config',
	'/server-status',
	'/server-info',
	'/cgi-bin/help.cgi',
	'/cgi-bin/test-cgi',
	'/index.php',
	'/wp-config.php',
	'/web.config',
	'/config.json',
	'/secrets.json',
	'/private.pem',
	'/id_rsa',
	'/backup.zip',
	'/database.sql',
	'/dump.sql'
];

test.describe('Common attack-path probes', () => {
	for (const path of ATTACK_PATHS) {
		test(`${path} non-5xx and not 200`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
			expect(resp.status(), path).not.toBe(200);
		});
	}
});
