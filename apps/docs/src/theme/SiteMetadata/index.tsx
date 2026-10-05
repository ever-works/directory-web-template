/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 * Ejected from @docusaurus/theme-classic 3.9.2, re-diffed against 3.10.2 (theme/SiteMetadata; 3.10
 * dropped `keyboardFocusedClassName` from theme-common/internal and renders a bare <body />, so this
 * file does too). Re-diff it against the
 * upstream component on every Docusaurus upgrade.
 *
 * The behavioral changes, both driven by src/utils/servedUrl:
 * - When the deployment redirects its site root (the docs.demo.ever.works ingress answers it with
 *   a 302 to /getting-started/, nginx.ingress.kubernetes.io/app-root), the root is never emitted
 *   as a canonical, og:url or alternate-language URL: wherever upstream would emit the default
 *   locale's root URL, this component emits the served page named by
 *   `customFields.homeCanonicalPath` (DOCS_HOME_CANONICAL_PATH in docusaurus.config.ts) instead.
 * - A build with no canonical origin (`customFields.hasCanonicalOrigin` false: no DOCS_URL, so the
 *   build is noindex) emits no canonical, og:url or alternate-language link at all, and neither
 *   does the 404 page (upstream names /404.html/ there, which answers 404).
 * - The pages docusaurus.config.ts lists as not documentation (`customFields.noIndexPaths`: the
 *   search page, the scaffold markdown page, the placeholder users page) render
 *   <meta name="robots" content="noindex, follow">, which also keeps them out of the sitemap.
 * With homeCanonicalPath "/" and a canonical origin it renders exactly what upstream renders on
 * every page but 404.html and the noindex pages.
 *
 * The canonical URL is built with useAlternatePageUtils for the current locale: the same site url
 * + locale baseUrl + trailing-slash-normalized pathname that upstream builds, without importing
 * @docusaurus/utils-common, which is not a dependency of this app. The type reference below gives
 * tsc theme-classic's `@theme/*` module declarations (for @theme/SearchMetadata); this app's
 * tsconfig does not load them.
 */
/// <reference types="@docusaurus/theme-classic" />
import React, { type ReactNode } from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { PageMetadata, useThemeConfig } from '@docusaurus/theme-common';
import { DEFAULT_SEARCH_TAG, useAlternatePageUtils } from '@docusaurus/theme-common/internal';
import SearchMetadata from '@theme/SearchMetadata';
import { useHasCanonicalOrigin, useIsNoIndexPage, useIsNotFoundPage, useServedUrl } from '../../utils/servedUrl';

// Canonical, og:url and hreflang are emitted only with a canonical origin, and never on 404.html.
function useEmitsPageUrls(): boolean {
	const hasCanonicalOrigin = useHasCanonicalOrigin();
	const isNotFoundPage = useIsNotFoundPage();
	return hasCanonicalOrigin && !isNotFoundPage;
}

// TODO move to SiteMetadataDefaults or theme-common ?
// Useful for i18n/SEO
// See https://developers.google.com/search/docs/advanced/crawling/localized-versions
// See https://github.com/facebook/docusaurus/issues/3317
function AlternateLangHeaders(): ReactNode {
	const {
		i18n: { currentLocale, defaultLocale, localeConfigs }
	} = useDocusaurusContext();
	const alternatePageUtils = useAlternatePageUtils();
	const servedUrl = useServedUrl();
	const emitsPageUrls = useEmitsPageUrls();
	const currentHtmlLang = localeConfigs[currentLocale]!.htmlLang;

	// HTML lang is a BCP 47 tag, but the Open Graph protocol requires
	// using underscores instead of dashes.
	// See https://ogp.me/#optional
	// See https://en.wikipedia.org/wiki/IETF_language_tag)
	const bcp47ToOpenGraphLocale = (code: string): string => code.replace('-', '_');

	// Note: it is fine to use both "x-default" and "en" to target the same url
	// See https://www.searchviu.com/en/multiple-hreflang-tags-one-url/
	return (
		<Head>
			{emitsPageUrls &&
				Object.entries(localeConfigs).map(([locale, { htmlLang }]) => (
					<link
						key={locale}
						rel="alternate"
						href={servedUrl(alternatePageUtils.createUrl({ locale, fullyQualified: true }))}
						hrefLang={htmlLang}
					/>
				))}
			{emitsPageUrls && (
				<link
					rel="alternate"
					href={servedUrl(alternatePageUtils.createUrl({ locale: defaultLocale, fullyQualified: true }))}
					hrefLang="x-default"
				/>
			)}

			<meta property="og:locale" content={bcp47ToOpenGraphLocale(currentHtmlLang)} />
			{Object.values(localeConfigs)
				.filter((config) => currentHtmlLang !== config.htmlLang)
				.map((config) => (
					<meta
						key={`meta-og-${config.htmlLang}`}
						property="og:locale:alternate"
						content={bcp47ToOpenGraphLocale(config.htmlLang)}
					/>
				))}
		</Head>
	);
}

// TODO move to SiteMetadataDefaults or theme-common ?
function CanonicalUrlHeaders(): ReactNode {
	const {
		i18n: { currentLocale }
	} = useDocusaurusContext();
	const alternatePageUtils = useAlternatePageUtils();
	const servedUrl = useServedUrl();
	const canonicalUrl = servedUrl(alternatePageUtils.createUrl({ locale: currentLocale, fullyQualified: true }));

	return (
		<Head>
			<meta property="og:url" content={canonicalUrl} />
			<link rel="canonical" href={canonicalUrl} />
		</Head>
	);
}

export default function SiteMetadata(): ReactNode {
	const {
		siteConfig: { noIndex: siteIsNoIndex },
		i18n: { currentLocale }
	} = useDocusaurusContext();

	// TODO maybe move these 2 themeConfig to siteConfig?
	// These seems useful for other themes as well
	const { metadata, image: defaultImage } = useThemeConfig();
	const emitsPageUrls = useEmitsPageUrls();
	// A noindex site (no DOCS_URL) already carries a site-wide robots meta; one per page is enough.
	const isNoIndexPage = useIsNoIndexPage() && !siteIsNoIndex;

	return (
		<>
			<Head>
				<meta name="twitter:card" content="summary_large_image" />
				{/* The keyboard focus class name need to be applied when SSR so links
				are outlined when JS is disabled */}
				<body />
			</Head>

			{isNoIndexPage && (
				<Head>
					<meta name="robots" content="noindex, follow" />
				</Head>
			)}

			{defaultImage && <PageMetadata image={defaultImage} />}

			{emitsPageUrls && <CanonicalUrlHeaders />}

			<AlternateLangHeaders />

			<SearchMetadata tag={DEFAULT_SEARCH_TAG} locale={currentLocale} />

			{/*
				It's important to have an additional <Head> element here, as it allows
				react-helmet to override default metadata values set in previous <Head>
				like "twitter:card". In same Head, the same meta would appear twice
				instead of overriding.
			*/}
			<Head>
				{/* Yes, "metadatum" is the grammatically correct term */}
				{metadata.map((metadatum, i) => (
					<meta key={i} {...metadatum} />
				))}
			</Head>
		</>
	);
}
