import { Geist, Geist_Mono } from 'next/font/google';
import { LayoutProvider, ThemeProvider } from '@/components/providers';
import { LocaleCookieRedirect } from '@/components/i18n/locale-cookie-redirect';
import { RTL_LOCALES, type Locale } from '@/lib/constants';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin']
});

// adjustFontFallback: false drops next/font's 'Geist Mono Fallback' face, which is Arial scaled
// to 134.59%. Geist Mono has no Arabic or Hebrew letters, so that proportional face would draw
// them in code at about a third larger than the text around them, and it would also draw Latin
// code before Geist Mono loads. The CSS stack after var(--font-geist-mono) (Consolas,
// Menlo, Courier New...) takes over instead, as it did before Geist Mono was wired up.
const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
	adjustFontFallback: false
});

/**
 * The `<html>` / `<head>` / `<body>` document every page renders in.
 *
 * It used to live in the root `app/layout.tsx`, which read the locale with
 * next-intl's `getLocale()`. The root layout renders before
 * `[locale]/layout.tsx` calls `setRequestLocale`, so that read always fell back
 * to the request headers, and every page became dynamic: rendered per request
 * and never cacheable (Spec 061). Now `[locale]/layout.tsx` renders this shell
 * with the locale from its route params, the root layout only passes children
 * through, and the few pages outside `[locale]` render it themselves.
 */
export function DocumentShell({ locale, children }: { locale: string; children: React.ReactNode }) {
	const dir = RTL_LOCALES.includes(locale as Locale) ? 'rtl' : 'ltr';

	return (
		<html lang={locale} dir={dir} suppressHydrationWarning>
			<head>
				{/*
					Returning-visitor locale redirect. Reads `NEXT_LOCALE` cookie
					and redirects client-side before paint if it disagrees with
					the current URL. Pairs with `LocaleSuggestionBanner` and the
					`localeDetection: false` setting in `i18n/routing.ts`.
					See `docs/performance/locale-detection.md` and Spec 019.
				*/}
				<LocaleCookieRedirect />
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased dark:bg-[#0a0a0a]`}
				suppressHydrationWarning
			>
				<ThemeProvider>
					<LayoutProvider>{children}</LayoutProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
