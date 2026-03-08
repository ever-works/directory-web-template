import type { Config } from "@docusaurus/types";
import path from "path";
import { themes as prismThemes } from "prism-react-renderer";

const SENTRY_DNS = process.env.NEXT_PUBLIC_SENTRY_DNS || null;
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || null;
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY || null;
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || null;
const HAS_ALGOLIA_CREDENTIALS =
  ALGOLIA_APP_ID && ALGOLIA_API_KEY && ALGOLIA_INDEX_NAME;
require("dotenv").config();
/** @type {import('@docusaurus/types').Config} */
const config: Config = {
  plugins: [
    SENTRY_DNS &&
      process.env.NODE_ENV === "production" && [
        "docusaurus-plugin-sentry",
        {
          DSN: process.env.NEXT_PUBLIC_SENTRY_DNS,
        },
      ],

    // Temporarily disabled search plugin due to build issues
    !HAS_ALGOLIA_CREDENTIALS && [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */

      {
        hashed: true,
        docsRouteBasePath: ["docs", "template"],
        docsDir: ["../../docs/intro", "../../docs"],
      },
    ],
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "template",
        path: "../../docs/",
        routeBasePath: "template",
        sidebarPath: "./sidebarsTemplate.ts",
        exclude: ["intro/**", "assets/**", "plans/**"],
        editUrl: "https://github.com/ever-works/ever-works-docs/tree/main/",
      },
    ],
  ],
  // Add custom scripts here that would be placed in <script> tags.
  scripts: [{ src: "https://buttons.github.io/buttons.js", async: true }],
  title: "Ever Works", // Title for your website.
  tagline: "Modern Directory Website Solution",
  favicon: "img/favicon.ico",
  // Set the production Url of your site here
  url: "https://docs.ever.works", // Your website URL
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "ever-works",
  // Used for publishing and more
  projectName: "ever-works-docs",

  onBrokenLinks: "warn",
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  themes: ["@docusaurus/theme-mermaid"],
  staticDirectories: ["../../docs/assets", "static"],
  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    path: "i18n",
    defaultLocale: "en",
    locales: [
      "en",
      "fr",
      "ar",
      "bg",
      "zh",
      "nl",
      "de",
      "he",
      "it",
      "pl",
      "pt",
      "ru",
      "es",
    ],
  },
  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      {
        blog: false,
        docs: {
          sidebarPath: "./sidebars.ts",
          path: "../../docs/intro/",
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/ever-works/ever-works-docs/tree/main/",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      },
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    {
      // Replace with your project's social card
      image: "/overview.png",

      colorMode: {
        defaultMode: "dark",
      },
      navbar: {
        style: "dark",
        logo: {
          alt: "Ever® Works Logo",
          srcDark: "/img/ever-works.svg",
          src: "img/ever-works-dark.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "introSidebar",
            position: "left",
            label: "Intro",
          },
{
            type: "docSidebar",
            sidebarId: "templateSidebar",
            docsPluginId: "template",
            position: "left",
            label: "Template",
          },
          { to: "/help", label: "Help", position: "left" },
          {
            type: "localeDropdown",
            position: "right",
            className: "header-locale-link",
          },
          {
            href: "https://github.com/ever-works",
            label: "GitHub",
            position: "right",
            className: "header-github-link",
          },
        ],
      },
      footer: {
        style: "dark",
        logo: {
          src: "/img/ever-works.svg",
          height: 40,
        },
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "Intro",
                to: "/docs",
              },
{
                label: "Template",
                to: "/template",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "User Showcases",
                href: "/users",
              },
              {
                label: "Stack Overflow",
                href: "https://stackoverflow.com/questions/tagged/ever-works-website-template",
              },
              {
                label: "Discord Chat",
                href: "https://discord.gg/ever",
              },
              {
                label: "Twitter",
                href: "https://twitter.com/everworks",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "GitHub",
                href: "https://github.com/ever-works/ever-works",
              },
              {
                html: `
                <div class="widget"><a class="btn" href="https://github.com/ever-works/ever-works" rel="noopener" target="_blank" aria-label="Star this project on GitHub"><svg viewBox="0 0 16 16" width="14" height="14" class="octicon octicon-star" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path></svg>&nbsp;<span>Star</span></a><a class="social-count" href="https://github.com/ever-works/ever-works/stargazers" rel="noopener" target="_blank" aria-label="100+ stargazers on GitHub">100</a></div>`,
              },
            ],
          },
        ],
        copyright: `Copyright © 2024-Present <a href="https://ever.co/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">Ever Co. LTD.</a>`,
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

            // Optional: Specify domains where the navigation should occur through window.location instead on history.push. Useful when our Algolia config crawls multiple documentation sites and we want to navigate with window.location.href to them.
            // externalUrlRegex: "external\\.com|domain\\.com",

            // Optional: Replace parts of the item URLs from Algolia. Useful when using the same search index for multiple deployments using a different baseUrl. You can use regexp or string in the `from` param. For example: localhost:3000 vs myCompany.com/docs
            replaceSearchResultPathname: {
              from: "/docs/", // or as RegExp: /\/docs\//
              to: "/",
            },

            // Optional: Algolia search parameters
            searchParameters: {},

            // Optional: path for search page that enabled by default (`false` to disable it)
            searchPagePath: "search",

            // Optional: whether the insights feature is enabled or not on Docsearch (`false` by default)
            insights: false,

            //... other Algolia params
          }
        : undefined,
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    },
  customFields: {
    EVER_WORKS_WEBSITE_TEMPLATE_API_URL:
      process.env.EVER_WORKS_WEBSITE_TEMPLATE_API_URL,
  },
};

export default config;
