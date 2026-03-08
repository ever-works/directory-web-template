---
id: roadmap
title: Roadmap & Future Direction
sidebar_label: Roadmap
---

# Roadmap & Future Direction

This page outlines the current development direction for the Ever Works Website Template and how the community can participate in shaping its future.

## Product Vision

The Ever Works Website Template aims to be the most comprehensive open-source solution for building professional directory websites. The long-term vision encompasses:

- **Production-grade directory websites** that are beautiful, performant, and fully customizable
- **Easy content management** through the Git-based CMS with optional AI-powered content generation via the [Ever Works Platform](https://docs.ever.works)
- **Extensible payment and authentication** supporting multiple providers out of the box
- **First-class internationalization** with full RTL support and growing language coverage

## Areas of Active Development

### Performance and Core Web Vitals

- Optimizing Largest Contentful Paint (LCP) for item listing and detail pages
- Reducing JavaScript bundle size through better code splitting and tree shaking
- Improving image optimization pipeline for directory item screenshots and logos
- Implementing partial prerendering for faster initial page loads

### Feature Enhancements

- Adding more filtering and search capabilities (faceted search, advanced filters)
- Implementing user-generated content features (reviews, ratings, comments)
- Adding more payment provider integrations and subscription management features
- Expanding the theming system with more built-in themes and easier customization

### Developer Experience

- Improving local development setup with better documentation and error messages
- Adding more comprehensive E2E test coverage with Playwright
- Creating starter templates for common directory types (SaaS, local business, resources)
- Improving TypeScript type safety across the codebase

### Internationalization

- Adding more built-in language translations
- Improving RTL layout support for Arabic and Hebrew
- Supporting per-directory language configuration
- Adding automated translation workflows

### Documentation

- Expanding API reference documentation with more examples
- Adding video tutorials for common tasks
- Creating architecture decision records (ADRs) for major design decisions
- Building interactive guides and playground environments

## How to Propose Features

### GitHub Issues

The primary way to propose features is through GitHub Issues at [github.com/ever-works/ever-works-website-template/issues](https://github.com/ever-works/ever-works-website-template/issues).

When creating a feature request:

1. **Check existing issues** first to avoid duplicates.
2. **Describe the problem** you are trying to solve, not just the solution you want.
3. **Provide context** about your use case, directory type, and scale.
4. **Include examples** (mockups, API schemas, configuration examples).

### GitHub Discussions

For broader ideas that need community input: [github.com/ever-works/ever-works-website-template/discussions](https://github.com/ever-works/ever-works-website-template/discussions)

### Discord

Join the [Ever Works Discord](https://discord.gg/ever) for real-time conversations about features and project direction.

## How Priorities Are Decided

| Factor | Weight | Description |
|---|---|---|
| **User demand** | High | Number of requests, upvotes, and community interest |
| **Strategic alignment** | High | How well the feature aligns with the product vision |
| **Implementation effort** | Medium | Complexity, time investment, and maintenance burden |
| **Breaking change risk** | Medium | Potential to disrupt existing users |
| **Contributor availability** | Medium | Whether maintainers or community members can take it on |

### Priority Tiers

- **P0 (Critical):** Security vulnerabilities, data loss bugs, or blocking issues. Addressed immediately.
- **P1 (High):** Features or fixes actively being worked on for the next release.
- **P2 (Medium):** Approved features planned but not yet scheduled.
- **P3 (Low):** Nice-to-have improvements. Great candidates for community contributions.

## Contributing to the Roadmap

1. **Submit well-written feature requests** with clear problem statements and use cases.
2. **Contribute code.** Pull requests are the fastest path from idea to reality. See the [Contributing Guide](/docs/contributing).
3. **Participate in discussions.** Provide feedback on proposals and share your experience.
4. **Report bugs.** Reliable bug reports help prioritize fixes and improve stability.

## Release Cadence

Releases are made when a meaningful set of features and fixes are ready:

- **Patch releases** (bug fixes) are published as needed, often weekly during active development.
- **Minor releases** (new features) are published roughly monthly.
- **Major releases** (breaking changes) are infrequent and accompanied by migration guides.

See the [Changelog & Versioning](/docs/changelog) page for details.

## Staying Updated

- **Watch the repository** on GitHub for notifications
- **Star the repository** to show support and help others discover the project
- **Join the [Discord](https://discord.gg/ever)** for real-time updates
- **Follow [@everworks](https://twitter.com/everworks)** on Twitter

## Contact

- **Email:** [ever@ever.co](mailto:ever@ever.co)
- **Website:** [ever.works](https://ever.works)
- **Discord:** [discord.gg/ever](https://discord.gg/ever)
