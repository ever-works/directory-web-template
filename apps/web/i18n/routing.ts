import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/constants";

/**
 * Locale URL style. Build-time choice driven by the `LOCALE_URL_STYLE` env var.
 *
 * - `as-needed` (default): default locale lives at `/`; other locales at `/<locale>/`.
 *   Compatible with the `client-banner` (Pattern A) and `server-redirect` (Pattern C)
 *   detection strategies.
 * - `always`: every locale is prefixed (`/en/...`, `/fr/...`); the bare `/` redirects.
 *   Required for the path-prefix detection strategy (Pattern B).
 *
 * Changing this is a breaking URL change for existing bookmarks; bump major.
 * See `docs/performance/locale-detection.md` for the full pattern matrix.
 */
const localePrefix: 'as-needed' | 'always' =
  process.env.LOCALE_URL_STYLE === 'always' ? 'always' : 'as-needed';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: LOCALES,

  // Used when no locale matches
  defaultLocale: DEFAULT_LOCALE,

  /**
   * Locale auto-detection is disabled at the routing layer so that the
   * response on `/` is fully edge-cacheable on Vercel and other CDNs.
   *
   * `next-intl`'s built-in detection mutates the response (Set-Cookie:
   * NEXT_LOCALE + Vary: accept-language), which disqualifies the page
   * from edge cache. We replace it with a userland strategy controlled by
   * `settings.i18n.locale_detection` in the site config:
   *
   *   - `client-banner` (default): a dismissible banner suggests the
   *     visitor's browser locale. HTML stays cacheable.
   *   - `server-redirect`: opt back into Accept-Language redirects via
   *     middleware (set `LOCALE_DETECTION_MODE=server-redirect`); breaks
   *     edge cache on `/` but matches the legacy behaviour.
   *   - `none`: no auto-detection; users navigate manually.
   *
   * See `docs/performance/locale-detection.md` and Spec 019.
   */
  localeDetection: false,

  localePrefix,
});
