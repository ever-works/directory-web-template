/**
 * Whether the middleware sends next-intl's hreflang RESPONSE HEADER
 * (`Link: <https://host/fr/path>; rel="alternate"; hreflang="fr", ...`).
 *
 * Off unless `I18N_ALTERNATE_LINKS_HEADER=true`. Every page already publishes
 * its hreflang cluster in the HTML (`alternates.languages`, see
 * lib/seo/hreflang.ts), on the public origin (NEXT_PUBLIC_CANONICAL_URL when it
 * is pinned) and for the page's CANONICAL path. The header can do neither: the
 * middleware builds it from the request as it arrived, so it names the scheme
 * and host the request came in on (`http://` behind a TLS-terminating proxy,
 * or the platform host of a site that has a brand domain) and the raw request
 * path (a legacy alias such as /categories/category/<id>/2, or any junk path).
 * It advertised URLs that redirect or are not canonical, and contradicted the
 * HTML cluster on the same response.
 */
export function alternateLinksHeaderEnabled(value: string | undefined): boolean {
	return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}
