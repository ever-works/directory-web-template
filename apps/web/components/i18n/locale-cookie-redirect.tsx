import { LOCALES, DEFAULT_LOCALE } from '@/lib/constants';

/**
 * Inline script injected into `<head>` that runs **before** React hydrates.
 *
 * Reads the `NEXT_LOCALE` cookie set by a previous visit. If the cookie names
 * a supported locale that differs from the current URL's locale, immediately
 * `location.replace`s to the cookied locale. This gives returning visitors
 * their preferred language without a flash of default-locale content and
 * without the server having to disqualify the response from CDN cache.
 *
 * Pairs with:
 *   - `LocaleSuggestionBanner` — sets `NEXT_LOCALE` when user picks a locale.
 *   - `i18n/routing.ts` `localeDetection: false` — server stops auto-detecting.
 *
 * See `docs/performance/locale-detection.md`.
 */
export function LocaleCookieRedirect() {
	const supportedLocales = JSON.stringify(LOCALES);
	const defaultLocale = DEFAULT_LOCALE;
	// Keep this script tiny and synchronous — it runs in document <head>
	// before any other JS, so it must not block paint for long.
	//
	// Subtle: when the visitor lands on a non-default locale root (e.g. `/fr`)
	// and the cookie says default locale, `p.substring(seg.length+1)` returns
	// an empty string. `location.replace('')` resolves to the *current* URL,
	// which would silently leave the visitor on the wrong locale. We force
	// `rest` to `/` in that case (and likewise for the non-default branch's
	// edge case) so the redirect always navigates somewhere meaningful.
	const script = `(function(){try{var m=document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);if(!m)return;var c=decodeURIComponent(m[1]);var L=${supportedLocales};if(L.indexOf(c)===-1)return;var p=window.location.pathname;var seg=p.split('/')[1]||'';var hasLoc=L.indexOf(seg)!==-1;var cur=hasLoc?seg:'${defaultLocale}';if(cur===c)return;var rest=hasLoc?p.substring(seg.length+1):p;if(!rest)rest='/';if(rest.charAt(0)!=='/')rest='/'+rest;var target=c==='${defaultLocale}'?rest:'/'+c+(rest==='/'?'':rest);window.location.replace(target+window.location.search+window.location.hash);}catch(e){}})();`;
	return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
