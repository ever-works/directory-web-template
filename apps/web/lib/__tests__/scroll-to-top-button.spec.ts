import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * The scroll-to-top button (`components/scroll-to-top-button.tsx`): the round button at the bottom right of every
 * public page, with an accessible name and a "back to top" hint.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Both strings used to be hard-coded English, so screen-reader users on the other 20 locales heard English. The
 * component now reads them from the message catalogue. These checks read the component's source for the namespace and
 * keys it uses (no DOM in this runner; the button only renders after a scroll event) and look those keys up in every
 * locale file.
 */

const WEB_DIR = join(__dirname, '..', '..');
const MESSAGES_DIR = join(WEB_DIR, 'messages');
const COMPONENT = readFileSync(join(WEB_DIR, 'components', 'scroll-to-top-button.tsx'), 'utf8');

type Catalogue = Record<string, Record<string, unknown> | undefined>;

function componentKeys(): { namespace?: string; labelKey?: string; hintKey?: string } {
	const namespace = /useTranslations\(\s*["']([^"']+)["']\s*\)/.exec(COMPONENT)?.[1];
	const labelKey = /aria-label=\{\s*t\(\s*["']([^"']+)["']\s*\)\s*\}/.exec(COMPONENT)?.[1];
	// The hint is the one other string the component renders: `{t('...')}` as element text.
	const textKeys = [...COMPONENT.matchAll(/>\s*\{\s*t\(\s*["']([^"']+)["']\s*\)\s*\}/g)].map((match) => match[1]);
	const hintKey = textKeys.length === 1 ? textKeys[0] : undefined;
	return { namespace, labelKey, hintKey };
}

function readLocale(file: string): Catalogue {
	return JSON.parse(readFileSync(join(MESSAGES_DIR, file), 'utf8'));
}

describe('scroll-to-top button', () => {
	it('takes its accessible name and hint from the message catalogue', () => {
		const { namespace, labelKey, hintKey } = componentKeys();
		assert.equal(namespace, 'header', 'useTranslations("header") not found');
		assert.equal(labelKey, 'SCROLL_TO_TOP', 'aria-label is not t("SCROLL_TO_TOP")');
		assert.equal(hintKey, 'BACK_TO_TOP', 'the hint text is not t("BACK_TO_TOP")');
		assert.doesNotMatch(COMPONENT, /aria-label="/, 'a hard-coded aria-label is left');
		assert.doesNotMatch(COMPONENT, /Scroll to top|Back to top/, 'hard-coded English is left');
	});

	it('hides the hint from screen readers, since the accessible name already says it', () => {
		const hintAt = COMPONENT.search(/\{\s*t\(\s*["']BACK_TO_TOP["']/);
		const buttonEnd = COMPONENT.indexOf('</button>');
		assert.ok(hintAt > buttonEnd && buttonEnd > 0, 'the hint is expected after the button');
		assert.ok(COMPONENT.lastIndexOf('aria-hidden="true"', hintAt) > buttonEnd, 'the hint is not aria-hidden');
	});

	it('resolves both strings in every locale, translated outside English', () => {
		const found = componentKeys();
		if (!found.namespace || !found.labelKey || !found.hintKey) return assert.fail('component keys not found');
		const namespace: string = found.namespace;
		const keys: string[] = [found.labelKey, found.hintKey];

		const locales = readdirSync(MESSAGES_DIR).filter((file) => file.endsWith('.json'));
		assert.ok(locales.length > 1, 'no locale files found');
		const english: Record<string, unknown> = readLocale('en.json')[namespace] ?? {};

		for (const file of locales) {
			const locale = file.replace(/\.json$/, '');
			// Each file on its own: request.ts merges en.json under each locale at runtime, which would hide a missing key.
			const messages = readLocale(file);
			for (const key of keys) {
				const raw: unknown = messages[namespace]?.[key];
				assert.ok(typeof raw === 'string', `${file}: ${namespace}.${key} is missing`);
				assert.ok(raw.trim().length > 0, `${file}: ${namespace}.${key} is empty`);
				assert.doesNotMatch(
					raw,
					/[{}<>]/,
					`${file}: ${namespace}.${key} contains { } < or >; it should be a plain label`
				);
				if (locale !== 'en') {
					assert.notEqual(raw, english[key], `${file}: ${namespace}.${key} is still English`);
				}
			}
		}
	});
});
