import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { createTranslator } from 'next-intl';

/**
 * The star rating control (`components/ui/rating.tsx`): the picker in the comment forms and the read-only stars shown
 * for each review and for an item's average rating.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * A read-only rating used to be five disabled radio buttons named "Rate 1 star" to "Rate 5 stars", with none checked
 * for a fractional average, so a screen reader never said the rating itself. Every label was English in all 21
 * locales, the focus ring was switched off and each click logged to the console. These checks read the component's
 * source (no DOM in this runner) and format the new messages in every locale file.
 */

const WEB_DIR = join(__dirname, '..', '..');
const MESSAGES_DIR = join(WEB_DIR, 'messages');
const COMPONENT = readFileSync(join(WEB_DIR, 'components', 'ui', 'rating.tsx'), 'utf8');

/** The keys the component must read, with the namespace they live in. */
const COMPONENT_KEYS = ['common.RATE_STARS', 'common.RATED_OUT_OF', 'itemDetail.RATING'];

type Catalogue = Record<string, Record<string, unknown> | undefined>;

function readLocale(file: string): Catalogue {
	return JSON.parse(readFileSync(join(MESSAGES_DIR, file), 'utf8'));
}

function localeFiles(): string[] {
	return readdirSync(MESSAGES_DIR).filter((file) => file.endsWith('.json'));
}

describe('star rating control', () => {
	it('has no hard-coded English labels', () => {
		assert.doesNotMatch(COMPONENT, /Rate \$\{/, 'the `Rate ${star} star` template is still there');
		assert.doesNotMatch(COMPONENT, /aria-label="/, 'a hard-coded aria-label is left');
		assert.doesNotMatch(COMPONENT, /["'`]Rat(e|ed|ing)\b/, 'hard-coded English is left');
	});

	it('reads its labels from the message catalogue', () => {
		assert.match(
			COMPONENT,
			/import\s*\{[^}]*\buseTranslations\b[^}]*\}\s*from\s*["']next-intl["']/,
			'useTranslations is not imported from next-intl'
		);
		assert.match(COMPONENT, /useTranslations\(\s*\)/, 'useTranslations() is not called');
		for (const key of COMPONENT_KEYS) {
			assert.match(
				COMPONENT,
				new RegExp(`\\bt\\(\\s*["']${key.replace('.', '\\.')}["']`),
				`t("${key}") not found`
			);
		}
	});

	it('renders a read-only rating as one named image, not as disabled radio buttons', () => {
		assert.match(COMPONENT, /role="img"/, 'the read-only wrapper has no role="img"');
		assert.doesNotMatch(COMPONENT, /disabled=\{readOnly\}/, 'read-only stars are still disabled buttons');
		assert.match(COMPONENT, /aria-hidden="true"/, 'the read-only stars are not aria-hidden');
		assert.match(
			COMPONENT,
			/Math\.round\(\s*value\s*\*\s*10\s*\)\s*\/\s*10/,
			'the read-only value is not rounded to one decimal'
		);
	});

	it('keeps a visible keyboard focus ring on the interactive stars', () => {
		assert.doesNotMatch(COMPONENT, /focus:ring-none/, 'focus:ring-none removes the focus ring');
		assert.match(COMPONENT, /focus-visible:ring-2/, 'no focus-visible:ring-2');
		assert.match(COMPONENT, /focus-visible:ring-yellow-400/, 'no focus-visible:ring-yellow-400');
	});

	it('does not log to the console', () => {
		assert.ok(!/console\.(log|debug|info)\(/.test(COMPONENT), 'a console.log is left in the component');
	});

	it('formats both new labels in every locale file, translated outside English', () => {
		const files = localeFiles();
		assert.equal(files.length, 21, 'expected 21 locale files');
		const english = readLocale('en.json').common ?? {};

		for (const file of files) {
			const locale = file.replace(/\.json$/, '');
			// Each file on its own: request.ts merges en.json under each locale at runtime, which would hide a missing key.
			const messages = readLocale(file);
			for (const key of ['RATE_STARS', 'RATED_OUT_OF']) {
				const raw: unknown = messages.common?.[key];
				assert.ok(typeof raw === 'string' && raw.trim().length > 0, `${file}: common.${key} is missing`);
				if (locale !== 'en') {
					assert.notEqual(raw, english[key], `${file}: common.${key} is still English`);
				}
			}

			const t = createTranslator({
				locale,
				messages,
				namespace: 'common',
				onError: (error: Error) => {
					throw error;
				}
			} as unknown as Parameters<typeof createTranslator>[0]) as unknown as (
				key: string,
				values: Record<string, number>
			) => string;

			const starLabels = [1, 2, 3, 4, 5].map((count) => t('RATE_STARS', { count }));
			for (const label of starLabels) {
				assert.doesNotMatch(label, /[{}#]/, `${file}: common.RATE_STARS left a placeholder in "${label}"`);
			}
			assert.equal(new Set(starLabels).size, 5, `${file}: common.RATE_STARS does not name each star count`);

			const rated = t('RATED_OUT_OF', { value: 4.5, max: 5 });
			assert.doesNotMatch(rated, /[{}]/, `${file}: common.RATED_OUT_OF left a placeholder in "${rated}"`);
			const formatted = new Intl.NumberFormat(locale).format(4.5);
			assert.ok(rated.includes(formatted), `${file}: "${rated}" does not show the value as ${formatted}`);
		}
	});
});
