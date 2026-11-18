import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Spec 061 R15: the server reads the default locale's content when it starts, in the
 * background, before the database initialisation it awaits.
 * Run with: `npx tsx --test apps/web/lib/__tests__/startup-warm.spec.ts`
 */
describe('content warm-up at server start', () => {
	it('starts the read without awaiting it, before the database initialisation', () => {
		const source = readFileSync(join(__dirname, '../../instrumentation.ts'), 'utf8').replace(/\s+/g, ' ');
		const register = source.slice(source.indexOf('export async function register()'));
		assert.ok(register.includes('warmContentInBackground();'));
		assert.ok(register.indexOf('warmContentInBackground();') < register.indexOf('await initializeDatabase()'));
		assert.ok(source.includes("const { items } = await fetchItems({ lang: DEFAULT_LOCALE });"));
		assert.ok(source.includes("if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.VERCEL) return;"));
	});
});
