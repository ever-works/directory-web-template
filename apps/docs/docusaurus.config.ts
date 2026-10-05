import type { Config, Plugin } from '@docusaurus/types';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { themes as prismThemes } from 'prism-react-renderer';

const SENTRY_DNS = process.env.NEXT_PUBLIC_SENTRY_DNS || null;
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || null;
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY || null;
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || null;
const HAS_ALGOLIA_CREDENTIALS = ALGOLIA_APP_ID && ALGOLIA_API_KEY && ALGOLIA_INDEX_NAME;
require('dotenv').config();

// Canonical origin of THIS docs build. Docusaurus derives every rel="canonical", og:url,
// alternate-language link, breadcrumb URL and sitemap <loc> from `url`, so it must be the
// primary host this build is served on. That host belongs to the REPOSITORY, not to this file:
// the Ever Works platform force-syncs this template verbatim into every Work repo, so a host
// written here would be claimed by every one of them - each instance's pages declaring
// themselves duplicates of the template's docs (the bug that pointing this at
// https://docs.ever.works, a different site, already caused once). So DOCS_URL comes from the
// build environment: .github/workflows/k8s-build.yml passes the repository's own Actions
// variable DOCS_URL into apps/docs/Dockerfile, for the production image only. A build without
// DOCS_URL still works, but it is noindex and names no host at all: no canonical, og:url,
// hreflang, og:image, breadcrumb structured data or sitemap, and a robots.txt with no Sitemap
// line. A deployment that has not said where its docs live must not point crawlers anywhere.
// A value that is not a bare http(s) origin stops the build: every URL above is built from it.
function readDocsUrl(): string {
	const raw = (process.env.DOCS_URL || '').trim();
	if (raw === '') {
		return '';
	}
	let parsed: URL | undefined;
	try {
		parsed = new URL(raw);
	} catch {
		parsed = undefined;
	}
	if (
		!parsed ||
		!/^https?:$/.test(parsed.protocol) ||
		parsed.pathname.replace(/\/+$/, '') !== '' ||
		parsed.search !== '' ||
		parsed.hash !== '' ||
		parsed.username !== '' ||
		parsed.password !== ''
	) {
		throw new Error(`DOCS_URL must be a bare origin such as https://docs.example.com, got ${JSON.stringify(raw)}.`);
	}
	return parsed.origin;
}
const DOCS_URL = readDocsUrl();
const HAS_DOCS_URL = DOCS_URL !== '';
// Docusaurus requires a `url` even when there is no canonical origin. This one is reserved
// (RFC 2606 .invalid) so it can never resolve, and nothing that reaches a crawler names it.
const PLACEHOLDER_URL = 'https://docs.example.invalid';

// src/theme/SiteMetadata and src/theme/DocBreadcrumbs/Items/Home are ejected from
// @docusaurus/theme-classic 3.9 and re-diffed against 3.10.2 (SiteMetadata leans on
// @docusaurus/theme-common/internal), while package.json allows ^3.10.2. An upgrade to another
// minor would keep rendering the ejected 3.10
// copies with nothing to say they diverged from upstream, so the build stops instead: re-diff
// the ejected components against the new upstream, then update EJECTED_THEME_CLASSIC.
// theme-classic is not a direct dependency; it is resolved the way preset-classic resolves it.
// Whoever merges the next Docusaurus minor bump (a Dependabot 3.11 PR, say) will see the Docs CI
// build and the -docs image build fail here until that re-diff is done: that is deliberate.
const EJECTED_THEME_CLASSIC = '3.10';
const THEME_CLASSIC_VERSION: string = createRequire(require.resolve('@docusaurus/preset-classic'))(
	'@docusaurus/theme-classic/package.json'
).version;
if (!THEME_CLASSIC_VERSION.startsWith(`${EJECTED_THEME_CLASSIC}.`)) {
	throw new Error(
		`@docusaurus/theme-classic is ${THEME_CLASSIC_VERSION}, but src/theme/SiteMetadata and ` +
			`src/theme/DocBreadcrumbs/Items/Home are ejected from ${EJECTED_THEME_CLASSIC}.x: re-diff them against ` +
			'the new upstream, then update EJECTED_THEME_CLASSIC in apps/docs/docusaurus.config.ts.'
	);
}

// Locales this build really renders. The image builds English only (`build:en`, see
// apps/docs/Dockerfile), yet Docusaurus announces EVERY configured locale as an alternate
// language of each page, and in an English-only build all of those links point back at the
// English URL - an invalid annotation (and a locale menu full of 404s). DOCS_LOCALES, a
// comma-separated subset such as "en", narrows the list to what is actually built; leaving
// it unset keeps every locale for a full multi-locale build.
const ALL_LOCALES = ['en', 'fr', 'ar', 'bg', 'zh', 'nl', 'de', 'he', 'it', 'pl', 'pt', 'ru', 'es'];
const BUILT_LOCALES = (process.env.DOCS_LOCALES || '')
	.split(',')
	.map((locale) => locale.trim())
	.filter((locale) => ALL_LOCALES.includes(locale));

// The page the site root is canonicalized to, for a deployment whose site root is a redirect.
// The ingress in front of docs.demo.ever.works (k8s-gitops apps/docs-demo-ever-works-prod,
// annotation nginx.ingress.kubernetes.io/app-root) answers the root with a 302 to
// /getting-started/, and a canonical, og:url, hreflang, breadcrumb or sitemap URL naming a
// redirect points crawlers at the redirect instead of a page. DOCS_HOME_CANONICAL_PATH names
// the page such a deployment sends its root to: the page rendered at the root then names that
// path (src/theme/SiteMetadata, src/theme/DocBreadcrumbs/StructuredData) and the root is left
// out of the sitemap. The site's own links to the root (navbar logo, footer "Home", the
// breadcrumb home icon) point at that page too, so no page links the redirect. Like DOCS_URL it
// describes one deployment, so it comes from the build environment (k8s-build.yml: the
// repository's Actions variable DOCS_HOME_CANONICAL_PATH, production image only). Unset, or
// "/", means the root serves itself: the root page is self-canonical and listed in the sitemap.
// It must be a plain site path; anything else stops the build (a Git Bash shell, for one,
// rewrites a leading "/" into "C:/Program Files/Git/..." unless MSYS_NO_PATHCONV=1 is set), and
// the build also stops if no page is rendered at that path.
function readHomeCanonicalPath(): string {
	const raw = (process.env.DOCS_HOME_CANONICAL_PATH || '').trim();
	if (raw === '' || raw === '/') {
		return '/';
	}
	if (!/^\/[A-Za-z0-9._~/-]*$/.test(raw) || raw.includes('//') || /(^|\/)\.{1,2}(\/|$)/.test(raw)) {
		throw new Error(
			`DOCS_HOME_CANONICAL_PATH must be a site path such as /getting-started/, got ${JSON.stringify(raw)}. ` +
				'(From Git Bash, set MSYS_NO_PATHCONV=1: it rewrites a leading "/" into a Windows path.)'
		);
	}
	return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}
const DOCS_HOME_CANONICAL_PATH = readHomeCanonicalPath();

// Pages that are not documentation: the search page, the Docusaurus scaffold page and the
// placeholder "Who is Using This?" page. They stay built and linked, but render
// <meta name="robots" content="noindex, follow"> (src/theme/SiteMetadata) and are left out of the
// sitemap. Paths are relative to baseUrl, with the trailing slash every page is served with.
const NOINDEX_PATHS = ['/search/', '/markdown-page/', '/users/'];

// robots.txt, written from the SAME `url` as the canonicals so it can never name another host.
// Without it the origin had no robots.txt and nothing pointed crawlers at the sitemap. A build
// with no DOCS_URL has no sitemap (noindex), so its robots.txt names none. The same post-build
// step refuses a DOCS_HOME_CANONICAL_PATH that names no rendered page: every page's links and
// the root's canonical would point at a 404.
function robotsTxtPlugin(): Plugin {
	return {
		name: 'docs-robots-txt',
		async postBuild({ siteConfig, outDir }) {
			if (
				DOCS_HOME_CANONICAL_PATH !== '/' &&
				!fs.existsSync(path.join(outDir, DOCS_HOME_CANONICAL_PATH, 'index.html'))
			) {
				throw new Error(
					`DOCS_HOME_CANONICAL_PATH is ${DOCS_HOME_CANONICAL_PATH}, but this build renders no page there.`
				);
			}
			const lines = ['User-agent: *', 'Allow: /', ''];
			if (HAS_DOCS_URL) {
				lines.push(`Sitemap: ${siteConfig.url}${siteConfig.baseUrl}sitemap.xml`, '');
			}
			await fs.promises.writeFile(path.join(outDir, 'robots.txt'), lines.join('\n'));
		}
	};
}

// A doc's meta description is, unless its front matter sets one, the first line of its body -
// and in this repository hundreds of pages open with "# Title" then "## Overview", so 123 pages
// were described as just "Overview". Headings are not descriptions: for a page with no
// `description` front matter, the description is the excerpt Docusaurus would take with the
// headings left out, i.e. the first paragraph. A page whose front matter sets a description, or
// whose body opens with a paragraph, is described exactly as before.
const { createExcerpt } = createRequire(require.resolve('@docusaurus/core/package.json'))('@docusaurus/utils') as {
	createExcerpt: (content: string) => string | undefined;
};

/** @type {import('@docusaurus/types').Config} */
const config: Config = {
	themes: [
		[
			'@easyops-cn/docusaurus-search-local',
			/** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
			{
				hashed: true,
				language: ['en', 'fr'],
				highlightSearchTermsOnTargetPage: true,
				explicitSearchResultPath: true,
				docsRouteBasePath: '/',
				docsDir: ['../../docs'],
				docsPluginIdForPreferredVersion: 'template'
			}
		],
		'@docusaurus/theme-mermaid'
	],
	plugins: [
		robotsTxtPlugin,
		SENTRY_DNS &&
			process.env.NODE_ENV === 'production' && [
				'docusaurus-plugin-sentry',
				{
					DSN: process.env.NEXT_PUBLIC_SENTRY_DNS
				}
			],
		[
			'@docusaurus/plugin-content-docs',
			{
				id: 'template',
				path: '../../docs/',
				routeBasePath: '/',
				sidebarPath: './sidebarsTemplate.ts',
				include: [
					'*.{md,mdx}',
					'advanced-guide/**/*.{md,mdx}',
					'api/**/*.{md,mdx}',
					'architecture/**/*.{md,mdx}',
					'authentication/**/*.{md,mdx}',
					'components/**/*.{md,mdx}',
					'configuration/**/*.{md,mdx}',
					'content-management/**/*.{md,mdx}',
					'database/**/*.{md,mdx}',
					'deployment/**/*.{md,mdx}',
					'development/**/*.{md,mdx}',
					'features/**/*.{md,mdx}',
					'getting-started/**/*.{md,mdx}',
					'guides/**/*.{md,mdx}',
					'hooks/**/*.{md,mdx}',
					'integrations/**/*.{md,mdx}',
					'internationalization/**/*.{md,mdx}',
					'payment/**/*.{md,mdx}',
					'services/**/*.{md,mdx}',
					'team-training/**/*.{md,mdx}',
					'trigger-dev/**/*.{md,mdx}',
					'types/**/*.{md,mdx}'
				],
				// "Edit this page" on every doc. A string editUrl is joined with the content path relative
				// to this app ('../../docs'), so the old '…/ever-works-docs/tree/main/' produced
				// '…/tree/main/../../docs/<file>.md' - a 404 on every doc page, in a repository that does
				// not exist publicly anyway. The docs are the template's own docs/ (the platform syncs
				// them verbatim into every Work repo, where an edit would be overwritten by the next
				// sync), so the link opens the file in this template's repository, on main: the branch the
				// production docs are built from, so every page's file is there.
				editUrl: ({ docPath }: { docPath: string }) =>
					`https://github.com/ever-works/directory-web-template/blob/main/docs/${docPath}`
			}
		]
	],
	// Add custom scripts here that would be placed in <script> tags.
	scripts: [{ src: 'https://buttons.github.io/buttons.js', async: true }],
	title: 'Ever Works', // Title for your website.
	tagline: 'Modern Directory Website Solution',
	favicon: 'img/favicon.ico',
	// Set the production Url of your site here
	url: HAS_DOCS_URL ? DOCS_URL : PLACEHOLDER_URL, // Your website URL (see DOCS_URL above)
	// Without a canonical origin every page is noindex and the sitemap is not written.
	noIndex: !HAS_DOCS_URL,
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: '/',
	// Every route is emitted as a directory (foo/index.html) and served at /foo/. Without this,
	// canonicals, og:url, hreflang and sitemap <loc> used the slash-less /foo, which the nginx
	// behind the host answers with a 301 to /foo/ - so almost every URL handed to crawlers was
	// a redirect instead of the page.
	trailingSlash: true,

	// GitHub pages deployment config.
	// If you aren't using GitHub pages, you don't need these.
	organizationName: 'ever-works',
	// Used for publishing and more
	projectName: 'ever-works-docs',

	onBrokenLinks: 'warn',
	markdown: {
		format: 'detect',
		mermaid: true,
		hooks: {
			onBrokenMarkdownLinks: 'warn'
		},
		// The meta description of a page without `description` front matter (see createExcerpt above).
		parseFrontMatter: async (params) => {
			const result = await params.defaultParseFrontMatter(params);
			if (result.frontMatter.description === undefined) {
				const description = createExcerpt(result.content.replace(/^ {0,3}#{1,6}(?:[ \t].*)?$/gm, ''));
				if (description) {
					result.frontMatter.description = description;
				}
			}
			return result;
		}
	},
	staticDirectories: ['../../docs/assets', 'static'],
	// Even if you don't use internationalization, you can use this field to set
	// useful metadata like html lang. For example, if your site is Chinese, you
	// may want to replace "en" with "zh-Hans".
	i18n: {
		path: 'i18n',
		defaultLocale: 'en',
		// The default locale must always stay in the list, or Docusaurus refuses the config.
		locales: BUILT_LOCALES.length > 0 ? Array.from(new Set(['en', ...BUILT_LOCALES])) : ALL_LOCALES
	},
	presets: [
		[
			'classic',
			/** @type {import('@docusaurus/preset-classic').Options} */
			{
				blog: false,
				docs: false,
				// When the deployment redirects its site root (DOCS_HOME_CANONICAL_PATH is not "/"), the
				// root is not a sitemap URL; the page it redirects to is listed in its own right. The
				// non-documentation pages (NOINDEX_PATHS) are not sitemap URLs either. Route paths are
				// matched with and without the trailing slash.
				sitemap: {
					ignorePatterns: [
						...(DOCS_HOME_CANONICAL_PATH === '/' ? [] : ['/']),
						...NOINDEX_PATHS.flatMap((noIndexPath) => [noIndexPath, noIndexPath.replace(/\/$/, '')])
					]
				},
				theme: {
					customCss: './src/css/custom.css'
				}
			}
		]
	],
	themeConfig:
		/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
		{
			// Replace with your project's social card. og:image must be an absolute URL, so a build
			// without a canonical origin (no DOCS_URL) has none rather than one on the placeholder host.
			image: HAS_DOCS_URL ? '/overview.png' : undefined,

			colorMode: {
				defaultMode: 'dark'
			},
			navbar: {
				style: 'dark',
				logo: {
					alt: 'Ever® Works Logo',
					srcDark: '/img/ever-works.svg',
					src: 'img/ever-works-dark.svg',
					// The site root, or the page a redirecting root is sent to (DOCS_HOME_CANONICAL_PATH).
					href: DOCS_HOME_CANONICAL_PATH
				},
				items: [
					{
						type: 'docSidebar',
						sidebarId: 'templateSidebar',
						docsPluginId: 'template',
						position: 'left',
						label: 'Home'
					},
					{ to: '/help', label: 'Help', position: 'left' },
					{
						type: 'localeDropdown',
						position: 'right',
						className: 'header-locale-link'
					},
					{
						href: 'https://github.com/ever-works',
						label: 'GitHub',
						position: 'right',
						className: 'header-github-link'
					}
				]
			},
			footer: {
				style: 'dark',
				logo: {
					src: '/img/ever-works.svg',
					height: 40
				},
				links: [
					{
						title: 'Docs',
						items: [
							{
								label: 'Home',
								// The site root, or the page a redirecting root is sent to (DOCS_HOME_CANONICAL_PATH).
								to: DOCS_HOME_CANONICAL_PATH
							},
							{
								label: 'Getting Started',
								to: '/getting-started/getting-started'
							},
							{
								label: 'Architecture',
								to: '/architecture/overview'
							}
						]
					},
					{
						title: 'Community',
						items: [
							{
								label: 'User Showcases',
								href: '/users'
							},
							{
								label: 'Stack Overflow',
								href: 'https://stackoverflow.com/questions/tagged/directory-web-template'
							},
							{
								label: 'Discord Chat',
								href: 'https://discord.gg/ever'
							},
							{
								label: 'Twitter',
								href: 'https://twitter.com/everworks'
							}
						]
					},
					{
						title: 'More',
						items: [
							{
								label: 'GitHub',
								href: 'https://github.com/ever-works/ever-works'
							},
							{
								html: `
                <div class="widget"><a class="btn" href="https://github.com/ever-works/ever-works" rel="noopener" target="_blank" aria-label="Star this project on GitHub"><svg viewBox="0 0 16 16" width="14" height="14" class="octicon octicon-star" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path></svg>&nbsp;<span>Star</span></a><a class="social-count" href="https://github.com/ever-works/ever-works/stargazers" rel="noopener" target="_blank" aria-label="100+ stargazers on GitHub">100</a></div>`
							}
						]
					}
				],
				copyright: `Copyright © 2024-Present <a href="https://ever.co/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">Ever Co. LTD.</a>`
			},
			algolia: HAS_ALGOLIA_CREDENTIALS
				? {
						// The application ID provided by Algolia
						appId: process.env.ALGOLIA_APP_ID,

						// Public API key: it is safe to commit it
						apiKey: process.env.ALGOLIA_API_KEY,

						// The index name to query
						indexName: process.env.ALGOLIA_INDEX_NAME,

						// Optional: see doc section below
						contextualSearch: true,

						// Optional: Replace parts of the item URLs from Algolia.
						replaceSearchResultPathname: {
							from: '/docs/',
							to: '/'
						},

						// Optional: Algolia search parameters
						searchParameters: {},

						// Optional: path for search page that enabled by default (`false` to disable it)
						searchPagePath: 'search',

						// Optional: whether the insights feature is enabled or not on Docsearch (`false` by default)
						insights: false
					}
				: undefined,
			prism: {
				theme: prismThemes.oneLight,
				darkTheme: prismThemes.vsDark
			}
		},
	customFields: {
		// Read by src/utils/servedUrl (SiteMetadata, DocBreadcrumbs/StructuredData,
		// DocBreadcrumbs/Items/Home): whether this build has a canonical origin at all, the
		// canonical path of the page at the site root, and the pages rendered noindex.
		hasCanonicalOrigin: HAS_DOCS_URL,
		homeCanonicalPath: DOCS_HOME_CANONICAL_PATH,
		noIndexPaths: NOINDEX_PATHS,
		EVER_WORKS_WEBSITE_TEMPLATE_API_URL: process.env.EVER_WORKS_WEBSITE_TEMPLATE_API_URL,
		footerData: {
			description: 'Ever Works is an open-source modern directory website solution.',
			socialLinks: [
				{
					title: 'GitHub',
					href: 'https://github.com/ever-works',
					icon: 'github'
				},
				{
					title: 'Twitter',
					href: 'https://twitter.com/everworks',
					icon: 'twitter'
				},
				{
					title: 'Discord',
					href: 'https://discord.gg/ever',
					icon: 'discord'
				}
			],
			systemStatus: {
				status: 'normal',
				message: 'All systems operational'
			},
			products: [
				{
					name: 'Ever Gauzy',
					href: 'https://gauzy.co',
					description: 'Open-Source Business Management Platform',
					icon: '/img/ever-works.svg'
				},
				{
					name: 'Ever Demand',
					href: 'https://ever.co/demand',
					description: 'Open-Source On-Demand Commerce Platform',
					icon: '/img/ever-works.svg'
				},
				{
					name: 'Ever Teams',
					href: 'https://ever.team',
					description: 'Open-Source Work & Project Management Platform',
					icon: '/img/ever-team.svg'
				},
				{
					name: 'Ever Works',
					href: 'https://ever.works',
					description: 'Modern Directory Website Solution',
					icon: '/img/ever-works.svg'
				}
			],
			companyInfo: {
				copyright: `Copyright © ${new Date().getFullYear()} Ever Co. LTD. All Rights Reserved.`,
				disclaimer:
					'*All product names, logos, and brands are property of their respective owners. All company, product and service names used in this website are for identification purposes only. Use of these names, logos, and brands does not imply endorsement.',
				legalLinks: [
					{
						text: 'Privacy Policy',
						href: 'https://ever.co/privacy'
					},
					{
						text: 'Terms of Service',
						href: 'https://ever.co/tos'
					},
					{
						text: 'Cookie Policy',
						href: 'https://ever.co/cookies'
					}
				]
			}
		}
	}
};

export default config;
