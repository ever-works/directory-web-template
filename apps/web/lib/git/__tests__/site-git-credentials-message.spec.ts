import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { SITE_GIT_TOKEN_SECRET_ENV, SITE_GIT_TOKEN_URL_ENV } from '../site-git-token';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The git-CMS repositories gate on `hasSiteGitCredentials()`, which accepts the site
 * git-token broker alone (spec 054). A "token not configured" error that names only
 * GH_TOKEN sends an operator after the wrong variable. The repositories import
 * `server-only` and cannot be loaded under `tsx --test`, so this reads their source.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8');

describe('missing git credentials errors name the broker variables (spec 054)', () => {
	for (const file of ['category.repository.ts', 'collection.repository.ts', 'tag.repository.ts']) {
		it(file, () => {
			const repository = source(`../../repositories/${file}`);
			const gate = repository.indexOf('if (!hasSiteGitCredentials(process.env, gitConfig.token)) {');
			assert.ok(gate > 0, `${file} does not gate on hasSiteGitCredentials`);
			const message = repository.slice(
				gate,
				repository.indexOf('\n', repository.indexOf('throw new Error(', gate))
			);
			assert.ok(
				message.includes('GitHub token not configured'),
				`${file}: the gate does not throw the token error`
			);
			assert.ok(
				message.includes(SITE_GIT_TOKEN_URL_ENV),
				`${file}: the error does not name ${SITE_GIT_TOKEN_URL_ENV}`
			);
			assert.ok(
				message.includes(SITE_GIT_TOKEN_SECRET_ENV),
				`${file}: the error does not name ${SITE_GIT_TOKEN_SECRET_ENV}`
			);
		});
	}
});
