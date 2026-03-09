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
  themes: [
    [
      "@easyops-cn/docusaurus-search-local",
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      {
        hashed: true,
        language: ["en", "fr"],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        docsRouteBasePath: "docs",
        docsDir: ["../../docs"],
        docsPluginIdForPreferredVersion: "template",
      },
    ],
    "@docusaurus/theme-mermaid",
  ],
  plugins: [
    SENTRY_DNS &&
      process.env.NODE_ENV === "production" && [
        "docusaurus-plugin-sentry",
        {
          DSN: process.env.NEXT_PUBLIC_SENTRY_DNS,
        },
      ],
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "template",
        path: "../../docs/",
        routeBasePath: "docs",
        sidebarPath: "./sidebarsTemplate.ts",
        include: [
          "*.{md,mdx}",
          "advanced-guide/**/*.{md,mdx}",
          "api/**/*.{md,mdx}",
          "architecture/**/*.{md,mdx}",
          "authentication/**/*.{md,mdx}",
          "components/**/*.{md,mdx}",
          "configuration/**/*.{md,mdx}",
          "content-management/**/*.{md,mdx}",
          "database/**/*.{md,mdx}",
          "deployment/**/*.{md,mdx}",
          "development/**/*.{md,mdx}",
          "features/**/*.{md,mdx}",
          "getting-started/**/*.{md,mdx}",
          "guides/**/*.{md,mdx}",
          "hooks/**/*.{md,mdx}",
          "integrations/**/*.{md,mdx}",
          "internationalization/**/*.{md,mdx}",
          "payment/**/*.{md,mdx}",
          "services/**/*.{md,mdx}",
          "team-training/**/*.{md,mdx}",
          "trigger-dev/**/*.{md,mdx}",
          "types/**/*.{md,mdx}",
        ],
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
    format: "detect",
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
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
        docs: false,
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
            sidebarId: "templateSidebar",
            docsPluginId: "template",
            position: "left",
            label: "Home",
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
                label: "Home",
                to: "/docs",
              },
              {
                label: "Getting Started",
                to: "/docs/getting-started/getting-started",
              },
              {
                label: "Architecture",
                to: "/docs/architecture/overview",
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

            // Optional: Replace parts of the item URLs from Algolia.
            replaceSearchResultPathname: {
              from: "/docs/",
              to: "/",
            },

            // Optional: Algolia search parameters
            searchParameters: {},

            // Optional: path for search page that enabled by default (`false` to disable it)
            searchPagePath: "search",

            // Optional: whether the insights feature is enabled or not on Docsearch (`false` by default)
            insights: false,
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
    footerData: {
      description:
        "Ever Works is an open-source modern directory website solution.",
      socialLinks: [
        {
          title: "GitHub",
          href: "https://github.com/ever-works",
          icon: "github",
        },
        {
          title: "Twitter",
          href: "https://twitter.com/everworks",
          icon: "twitter",
        },
        {
          title: "Discord",
          href: "https://discord.gg/ever",
          icon: "discord",
        },
      ],
      systemStatus: {
        status: "normal",
        message: "All systems operational",
      },
      products: [
        {
          name: "Ever Gauzy",
          href: "https://gauzy.co",
          description: "Open-Source Business Management Platform",
          icon: "/img/ever-works.svg",
        },
        {
          name: "Ever Demand",
          href: "https://ever.co/demand",
          description: "Open-Source On-Demand Commerce Platform",
          icon: "/img/ever-works.svg",
        },
        {
          name: "Ever Teams",
          href: "https://ever.team",
          description: "Open-Source Work & Project Management Platform",
          icon: "/img/ever-team.svg",
        },
        {
          name: "Ever Works",
          href: "https://ever.works",
          description: "Modern Directory Website Solution",
          icon: "/img/ever-works.svg",
        },
      ],
      companyInfo: {
        copyright: `Copyright © ${new Date().getFullYear()} Ever Co. LTD. All Rights Reserved.`,
        disclaimer:
          "*All product names, logos, and brands are property of their respective owners. All company, product and service names used in this website are for identification purposes only. Use of these names, logos, and brands does not imply endorsement.",
        legalLinks: [
          {
            text: "Privacy Policy",
            href: "https://ever.co/privacy",
          },
          {
            text: "Terms of Service",
            href: "https://ever.co/tos",
          },
          {
            text: "Cookie Policy",
            href: "https://ever.co/cookies",
          },
        ],
      },
    },
  },
};

export default config;
