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
	const script = `(function(){try{var m=document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);if(!m)return;var c=decodeURIComponent(m[1]);var L=${supportedLocales};if(L.indexOf(c)===-1)return;var p=window.location.pathname;var seg=p.split('/')[1]||'';var cur=L.indexOf(seg)!==-1?seg:'${defaultLocale}';if(cur===c)return;var rest=L.indexOf(seg)!==-1?p.substring(seg.length+1):p;if(c==='${defaultLocale}'){window.location.replace(rest+window.location.search+window.location.hash);}else{window.location.replace('/'+c+(rest.startsWith('/')?rest:'/'+rest)+window.location.search+window.location.hash);}}catch(e){}})();`;
	return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
