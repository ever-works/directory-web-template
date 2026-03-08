---
id: guides
title: Guides & Tutorials
sidebar_label: Overview
sidebar_position: 0
---

# Guides & Tutorials

This section contains practical, step-by-step guides for customizing, extending, and operating your Ever Works directory website. Each guide is self-contained but may link to related architecture pages for deeper context.

## How to Use This Section

Guides are organized by category. If you are **setting up the template for the first time**, start with the Customization and Theming guides to match the site to your brand. If you are **operating a running site**, the Admin and Client Dashboard guides will be most relevant. Developers extending the template should work through the Infrastructure and Testing guides.

## Customization & Appearance

These guides cover how to make the template your own -- from colors and layouts to navigation and footer content.

| Guide | Description |
|---|---|
| [Customization](/template/guides/customization) | Comprehensive guide to customizing your directory site -- branding, colors, layouts, and content |
| [Theming](/template/guides/theming) | The theme system: pre-built themes, custom theme creation, and runtime theme switching |
| [Dynamic Colors](/template/guides/dynamic-colors) | How the dynamic color generation pipeline works and how to configure it |
| [Layouts & Templates](/template/guides/layouts-templates) | Customize page layouts, listing templates, and detail page structures |
| [Custom Navigation](/template/guides/custom-navigation) | Configure the navbar, sidebar, and breadcrumb navigation |
| [Footer Customization](/template/guides/footer-customization) | Modify footer content, links, and layout |
| [UI Components](/template/guides/ui-components) | Available UI components and how to use them in your pages |

## Admin & Dashboard

Guides for managing content, users, and site settings through the built-in dashboards.

| Guide | Description |
|---|---|
| [Admin Dashboard](/template/guides/admin-dashboard) | Overview of admin features: content management, user roles, analytics, and settings |
| [Admin Deep Dive](/template/guides/admin-deep-dive) | Advanced admin topics: bulk operations, audit logs, and moderation workflows |
| [Admin Components](/template/guides/admin-components) | Reusable admin UI components and how to extend the admin interface |
| [Client Dashboard](/template/guides/client-dashboard) | The client-facing dashboard for item owners: submissions, analytics, and profile management |

## Data & Content

Guides related to content management, data utilities, and URL handling.

| Guide | Description |
|---|---|
| [Slug Utilities](/template/guides/slug-utilities) | URL slug generation, validation, and conflict resolution |
| [URL Utilities](/template/guides/url-utilities) | URL construction helpers, query parameter management, and canonical URLs |
| [Filter Sync](/template/guides/filter-sync) | How filter state is synchronized between URL parameters and the UI |
| [Pagination Patterns](/template/guides/pagination-patterns) | Server-side and client-side pagination implementations |
| [Currency Formatting](/template/guides/currency-formatting) | Locale-aware currency display and detection |

## Email & Notifications

| Guide | Description |
|---|---|
| [Email Templates](/template/guides/email-templates) | Create and customize transactional email templates using Resend |

## Monetization & Sponsorship

| Guide | Description |
|---|---|
| [Sponsorship System](/template/guides/sponsorship-system) | Set up and manage sponsored listings and advertisement slots |
| [Survey System](/template/guides/survey-system) | Integrate user surveys for feedback collection |

## Infrastructure & Operations

Guides for performance, reliability, security, and observability.

| Guide | Description |
|---|---|
| [Performance Optimization](/template/guides/performance-optimization) | Caching strategies, bundle optimization, and rendering performance |
| [Caching Strategy](/template/guides/caching-strategy) | The multi-layer caching architecture: in-memory, React Query, and HTTP cache headers |
| [Error Handling](/template/guides/error-handling) | Error boundary patterns, API error responses, and user-facing error pages |
| [Logging](/template/guides/logging) | Structured logging setup and log levels |
| [Rate Limiting](/template/guides/rate-limiting) | API rate limiting configuration and implementation |
| [Bot Detection](/template/guides/bot-detection) | reCAPTCHA integration and bot protection strategies |
| [Database Health Check](/template/guides/database-health-check) | Monitoring database connectivity and performance |
| [Accessibility](/template/guides/accessibility) | Accessibility standards, testing, and common patterns used in the template |

## Testing & Development

| Guide | Description |
|---|---|
| [Testing Patterns](/template/guides/testing-patterns) | Playwright E2E test structure, page objects, fixtures, and running tests |
| [Scripts Reference](/template/guides/scripts-reference) | All CLI scripts in the `scripts/` directory: what they do and when to use them |

## Suggested Learning Paths

### Path 1: Brand Customization (Designer / Product Owner)

1. [Customization](/template/guides/customization) -- understand what can be changed
2. [Theming](/template/guides/theming) -- pick or create a theme
3. [Dynamic Colors](/template/guides/dynamic-colors) -- fine-tune the color palette
4. [Footer Customization](/template/guides/footer-customization) -- update footer links and branding
5. [Custom Navigation](/template/guides/custom-navigation) -- configure menus

### Path 2: Site Administration (Admin / Content Manager)

1. [Admin Dashboard](/template/guides/admin-dashboard) -- learn the admin interface
2. [Admin Deep Dive](/template/guides/admin-deep-dive) -- advanced operations
3. [Client Dashboard](/template/guides/client-dashboard) -- understand the client-side experience
4. [Sponsorship System](/template/guides/sponsorship-system) -- manage sponsored content

### Path 3: Developer Extension (Full-Stack Developer)

1. [Architecture Overview](/template/architecture) -- understand the codebase structure
2. [Testing Patterns](/template/guides/testing-patterns) -- know how to verify changes
3. [Error Handling](/template/guides/error-handling) -- handle failures gracefully
4. [Caching Strategy](/template/guides/caching-strategy) -- understand the caching layers
5. [Performance Optimization](/template/guides/performance-optimization) -- keep the site fast
6. [Scripts Reference](/template/guides/scripts-reference) -- use the CLI tools effectively

### Path 4: Infrastructure & DevOps

1. [Database Health Check](/template/guides/database-health-check) -- monitor database health
2. [Logging](/template/guides/logging) -- set up structured logging
3. [Rate Limiting](/template/guides/rate-limiting) -- protect your API endpoints
4. [Bot Detection](/template/guides/bot-detection) -- prevent abuse
5. [Performance Optimization](/template/guides/performance-optimization) -- optimize for production load

## Cross-References

These guides are closely related to the architecture documentation. For deeper technical context, see:

- **[Architecture Overview](/template/architecture)** -- system design and layer responsibilities
- **[Theme System](/template/architecture/theme-system)** -- architecture behind theming (pairs with the Theming guide)
- **[Guards System](/template/architecture/guards-system)** -- access control architecture (pairs with Admin guides)
- **[Repository Patterns](/template/architecture/repository-patterns)** -- data access patterns (context for data guides)
- **[API Layer](/template/architecture/api-layer)** -- API route conventions (context for rate limiting and error handling)

## Getting Help

If you run into issues while following a guide:

1. **Check the [Quick Reference](/template/getting-started/quick-reference)** for common commands and patterns.
2. **Review [Getting Started](/template/getting-started)** if you have environment or setup problems.
3. **Open an issue** on the [GitHub repository](https://github.com/ever-works/ever-works-website-template/issues) for bugs or feature requests.

---

Pick the guide most relevant to your current task, or follow one of the learning paths above for a structured walkthrough.
