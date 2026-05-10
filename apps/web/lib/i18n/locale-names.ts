import { LOCALES, type Locale } from '@/lib/constants';

/**
 * Native names for every supported locale. Used by the language switcher and
 * the locale-suggestion banner so we can ask "Switch to Français?" rather
 * than the less friendly "Switch to fr?".
 *
 * Keep in sync with `LOCALES` in `lib/constants.ts`.
 */
export const LOCALE_NATIVE_NAMES: Readonly<Record<Locale, string>> = {
	en: 'English',
	fr: 'Français',
	es: 'Español',
	zh: '简体中文',
	de: 'Deutsch',
	ar: 'العربية',
	he: 'עברית',
	ru: 'Русский',
	uk: 'Українська',
	pt: 'Português',
	it: 'Italiano',
	ja: '日本語',
	ko: '한국어',
	nl: 'Nederlands',
	pl: 'Polski',
	tr: 'Türkçe',
	vi: 'Tiếng Việt',
	th: 'ไทย',
	hi: 'हिन्दी',
	id: 'Indonesia',
	bg: 'Български',
} as const;

const SUPPORTED_LOCALE_SET: ReadonlySet<string> = new Set(LOCALES);

export function isSupportedLocale(value: string | null | undefined): value is Locale {
	return value !== null && value !== undefined && SUPPORTED_LOCALE_SET.has(value);
}

/**
 * Map a browser `Accept-Language` value (e.g. `fr-FR`) to the closest supported
 * locale (`fr`). Returns `null` if no supported locale matches.
 */
export function matchBrowserLocale(value: string | null | undefined): Locale | null {
	if (!value) return null;
	const normalized = value.toLowerCase();
	const primary = normalized.split('-')[0];
	if (isSupportedLocale(primary)) return primary;
	return null;
}
