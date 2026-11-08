import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readPublicPaymentConfigFromRuntimeEnv } from '../payment/public-config';

/**
 * The demo banner (`components/layout/demo-banner.tsx`): the strip above the header that only a demo deployment
 * (`NEXT_PUBLIC_DEMO=true`, as demo.ever.works) shows.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The banner reads the RUNTIME flag through `usePublicPaymentConfig()`, which takes it from
 * `GET /api/payment/public-config` (`readPublicPaymentConfigFromRuntimeEnv`): customer directories run the same
 * image as the demo, so only the pod's env may switch the banner on.
 */

const MESSAGES_DIR = join(__dirname, '..', '..', 'messages');

function withEnv(value: string | undefined, run: () => void) {
	const previous = process.env.NEXT_PUBLIC_DEMO;
	if (value === undefined) delete process.env.NEXT_PUBLIC_DEMO;
	else process.env.NEXT_PUBLIC_DEMO = value;
	try {
		run();
	} finally {
		if (previous === undefined) delete process.env.NEXT_PUBLIC_DEMO;
		else process.env.NEXT_PUBLIC_DEMO = previous;
	}
}

describe('demo banner', () => {
	it('is switched on by the runtime NEXT_PUBLIC_DEMO=true only', () => {
		withEnv('true', () => assert.equal(readPublicPaymentConfigFromRuntimeEnv().demo, true));
		withEnv('false', () => assert.equal(readPublicPaymentConfigFromRuntimeEnv().demo, false));
		withEnv('', () => assert.equal(readPublicPaymentConfigFromRuntimeEnv().demo, false));
		withEnv(undefined, () => assert.equal(readPublicPaymentConfigFromRuntimeEnv().demo, false));
	});

	it('has its two strings in every locale', () => {
		const locales = readdirSync(MESSAGES_DIR).filter((file) => file.endsWith('.json'));
		assert.ok(locales.length > 1, 'no locale files found');

		for (const file of locales) {
			const messages = JSON.parse(readFileSync(join(MESSAGES_DIR, file), 'utf8'));
			for (const key of ['DEMO_BANNER_TEXT', 'DEMO_BANNER_SIGN_UP']) {
				const value = messages.common?.[key];
				assert.equal(typeof value, 'string', `${file}: common.${key} is missing`);
				assert.ok(value.trim().length > 0, `${file}: common.${key} is empty`);
			}
		}
	});
});
