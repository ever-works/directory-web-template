import { Geist, Geist_Mono } from 'next/font/google';
import { Poppins, Open_Sans, Noto_Sans_SC, Noto_Sans_JP, Noto_Sans_KR, Noto_Sans_Arabic, Noto_Sans_Thai } from 'next/font/google';

// ── Base fonts (always loaded, preloaded by default) ──────────────────────────

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin', 'latin-ext', 'cyrillic'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin', 'latin-ext', 'cyrillic'],
});

const poppins = Poppins({
	variable: '--font-poppins',
	subsets: ['latin', 'latin-ext', 'devanagari'],
	weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
	style: ['normal', 'italic'],
});

const openSans = Open_Sans({
	variable: '--font-open-sans',
	subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'hebrew', 'vietnamese'],
});

// ── Supplementary fonts (conditionally applied, NOT preloaded) ────────────────

const notoSansSC = Noto_Sans_SC({
	variable: '--font-noto-sc',
	subsets: ['latin'],
	preload: false,
});

const notoSansJP = Noto_Sans_JP({
	variable: '--font-noto-jp',
	subsets: ['latin'],
	preload: false,
});

const notoSansKR = Noto_Sans_KR({
	variable: '--font-noto-kr',
	subsets: ['latin'],
	preload: false,
});

const notoSansArabic = Noto_Sans_Arabic({
	variable: '--font-noto-arabic',
	subsets: ['arabic'],
	preload: false,
});

const notoSansThai = Noto_Sans_Thai({
	variable: '--font-noto-thai',
	subsets: ['thai'],
	preload: false,
});

// ── Locale → supplementary font mapping ───────────────────────────────────────

const LOCALE_FONT_MAP: Record<string, { font: { variable: string; className: string }; localeClass: string }> = {
	zh: { font: notoSansSC, localeClass: 'font-locale-zh' },
	ja: { font: notoSansJP, localeClass: 'font-locale-ja' },
	ko: { font: notoSansKR, localeClass: 'font-locale-ko' },
	ar: { font: notoSansArabic, localeClass: 'font-locale-ar' },
	th: { font: notoSansThai, localeClass: 'font-locale-th' },
};

// Base CSS-variable classes (always applied)
const BASE_CLASSES = [
	geistSans.variable,
	geistMono.variable,
	poppins.variable,
	openSans.variable,
].join(' ');

/**
 * Returns the CSS class names to apply on `<body>` for a given locale.
 * - Always includes base font CSS variable classes.
 * - For CJK/Arabic/Thai locales, also includes the supplementary font's CSS
 *   variable class and a `font-locale-{locale}` class for CSS cascade override.
 */
export function getFontClassNames(locale?: string): string {
	if (!locale) return BASE_CLASSES;
	const entry = LOCALE_FONT_MAP[locale];
	if (entry) {
		return `${BASE_CLASSES} ${entry.font.variable} ${entry.localeClass}`;
	}
	return BASE_CLASSES;
}
