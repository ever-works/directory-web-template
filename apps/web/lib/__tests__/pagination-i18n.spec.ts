import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * The two shared pagination controls: `components/universal-pagination.tsx` (client-side paging in grids and admin
 * tables) and `components/filters/components/pagination/paginate.tsx` (URL-based paging on listing pages).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Both used to hard-code the English "Page X of Y" line and the English `aria-label="pagination"` on the nav landmark,
 * so every other locale saw and heard English. They now read both strings from the `common` namespace. These checks
 * read the component sources (no DOM in this runner) and look the keys up in every locale file.
 */

const WEB_DIR = join(__dirname, '..', '..');
const MESSAGES_DIR = join(WEB_DIR, 'messages');
const COMPONENTS: Record<string, string> = {
	'universal-pagination.tsx': readFileSync(join(WEB_DIR, 'components', 'universal-pagination.tsx'), 'utf8'),
	'paginate.tsx': readFileSync(
		join(WEB_DIR, 'components', 'filters', 'components', 'pagination', 'paginate.tsx'),
		'utf8'
	)
};

type Catalogue = Record<string, Record<string, unknown> | undefined>;

function readLocale(file: string): Catalogue {
	return JSON.parse(readFileSync(join(MESSAGES_DIR, file), 'utf8'));
}

describe('pagination controls i18n', () => {
	for (const [name, source] of Object.entries(COMPONENTS)) {
		it(`${name} takes its label and page line from the message catalogue`, () => {
			assert.match(source, /useTranslations\(\s*["']common["']\s*\)/, 'useTranslations("common") not found');
			assert.match(source, /aria-label=\{\s*t\(\s*["']PAGINATION_LABEL["']\s*\)\s*\}/, 'aria-label is not t("PAGINATION_LABEL")');
			assert.match(source, /t\.rich\(\s*["']PAGINATION_PAGE_OF["']/, 'the page line is not t.rich("PAGINATION_PAGE_OF")');
			assert.doesNotMatch(source, /aria-label="/, 'a hard-coded aria-label is left');
			assert.doesNotMatch(source, /\bPage\{["' ]+\}|>\s*Page\s/, 'hard-coded "Page … of" text is left');
		});

		it(`${name} calls the translation hook before any early return`, () => {
			const hookAt = source.search(/useTranslations\(/);
			const returnAt = source.search(/return null;/);
			assert.ok(hookAt > 0 && returnAt > 0, 'hook or early return not found');
			assert.ok(hookAt < returnAt, 'the hook runs after an early return (breaks the rules of hooks)');
		});
	}

	it('resolves both keys in every locale, translated outside English, with the placeholders the components pass', () => {
		const locales = readdirSync(MESSAGES_DIR).filter((file) => file.endsWith('.json'));
		assert.ok(locales.length > 1, 'no locale files found');
		const english = readLocale('en.json').common ?? {};

		for (const file of locales) {
			const locale = file.replace(/\.json$/, '');
			// Each file on its own: request.ts merges en.json under each locale at runtime, which would hide a missing key.
			const common = readLocale(file).common ?? {};

			const label = common.PAGINATION_LABEL;
			assert.ok(typeof label === 'string' && label.trim().length > 0, `${file}: common.PAGINATION_LABEL is missing`);
			assert.doesNotMatch(label, /[{}<>]/, `${file}: common.PAGINATION_LABEL should be a plain label`);

			const line = common.PAGINATION_PAGE_OF;
			assert.ok(typeof line === 'string', `${file}: common.PAGINATION_PAGE_OF is missing`);
			assert.match(line, /\{current\}/, `${file}: PAGINATION_PAGE_OF has no {current}`);
			assert.match(line, /\{total\}/, `${file}: PAGINATION_PAGE_OF has no {total}`);
			// The components highlight both numbers through the `num` tag.
			assert.equal((line.match(/<num>/g) ?? []).length, 2, `${file}: PAGINATION_PAGE_OF needs two <num> tags`);
			assert.equal((line.match(/<\/num>/g) ?? []).length, 2, `${file}: PAGINATION_PAGE_OF has unbalanced <num> tags`);

			if (locale !== 'en') {
				// French spells the word the same way as English, so the label is exempt there.
				if (locale !== 'fr') {
					assert.notEqual(label, english.PAGINATION_LABEL, `${file}: PAGINATION_LABEL is still English`);
				}
				assert.notEqual(line, english.PAGINATION_PAGE_OF, `${file}: PAGINATION_PAGE_OF is still English`);
			}
		}
	});
});
