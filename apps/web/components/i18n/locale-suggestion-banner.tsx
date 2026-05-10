'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALE_NATIVE_NAMES, matchBrowserLocale } from '@/lib/i18n/locale-names';
import type { Locale } from '@/lib/constants';

const DISMISS_COOKIE = 'locale_suggestion_dismissed';
const PREFERRED_COOKIE = 'NEXT_LOCALE';
const COOKIE_MAX_AGE_DAYS = 365;

function getCookie(name: string): string | undefined {
	if (typeof document === 'undefined') return undefined;
	const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
	return match ? decodeURIComponent(match[2]) : undefined;
}

function setCookie(name: string, value: string): void {
	if (typeof document === 'undefined') return;
	const expires = new Date(Date.now() + COOKIE_MAX_AGE_DAYS * 86400 * 1000).toUTCString();
	document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Locale suggestion banner — Pattern A from `docs/performance/locale-detection.md`.
 *
 * Mounted by `app/[locale]/layout.tsx` only when
 * `settings.i18n.locale_detection === 'client-banner'` (the default).
 *
 * Behaviour:
 *   1. After hydration, read `navigator.language` and resolve it against the
 *      template's supported locales.
 *   2. If the visitor's browser locale is supported AND differs from the
 *      currently-rendered locale AND the user has not previously dismissed
 *      the banner AND has not previously chosen a locale, show a small
 *      dismissible bar offering to switch.
 *   3. Switching sets `NEXT_LOCALE` so future visits land on the chosen
 *      locale automatically (the inline `<LocaleCookieRedirect>` script in
 *      the document head reads it before paint).
 *   4. Dismissing sets a long-lived `locale_suggestion_dismissed` cookie so
 *      the banner does not reappear.
 *
 * The component renders nothing on the server, so this code does not affect
 * the cacheable HTML payload — it adds only a tiny client-side hydration
 * effect.
 */
export function LocaleSuggestionBanner() {
	const currentLocale = useLocale() as Locale;
	const router = useRouter();
	const pathname = usePathname();
	const [suggestedLocale, setSuggestedLocale] = useState<Locale | null>(null);

	useEffect(() => {
		// Bail if user already dismissed or already picked a preferred locale.
		if (getCookie(DISMISS_COOKIE) === '1') return;
		if (getCookie(PREFERRED_COOKIE)) return;

		const browserLocale = matchBrowserLocale(navigator.language);
		if (!browserLocale || browserLocale === currentLocale) return;

		setSuggestedLocale(browserLocale);
	}, [currentLocale]);

	if (!suggestedLocale) return null;

	const nativeName = LOCALE_NATIVE_NAMES[suggestedLocale];

	const handleSwitch = () => {
		setCookie(PREFERRED_COOKIE, suggestedLocale);
		router.replace(pathname, { locale: suggestedLocale });
	};

	const handleDismiss = () => {
		setCookie(DISMISS_COOKIE, '1');
		setSuggestedLocale(null);
	};

	return (
		<div
			role="region"
			aria-label="Language suggestion"
			data-testid="locale-suggestion-banner"
			className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 max-w-lg rounded-md border border-border bg-background/95 px-4 py-2 shadow-md backdrop-blur"
		>
			<div className="flex items-center gap-3 text-sm">
				<span>
					This page is also available in <strong>{nativeName}</strong>.
				</span>
				<button
					type="button"
					onClick={handleSwitch}
					className="rounded bg-primary px-2 py-1 text-primary-foreground hover:opacity-90"
					data-testid="locale-suggestion-switch"
				>
					Switch to {nativeName}
				</button>
				<button
					type="button"
					onClick={handleDismiss}
					className="rounded px-2 py-1 text-muted-foreground hover:text-foreground"
					aria-label="Dismiss language suggestion"
					data-testid="locale-suggestion-dismiss"
				>
					×
				</button>
			</div>
		</div>
	);
}
