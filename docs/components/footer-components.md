---
id: footer-components
title: Footer Components
sidebar_label: Footer Components
sidebar_position: 32
---

# Footer Components

The site footer lives in `components/footer/` and is composed of several sub-components handling brand display, navigation link groups, social links, newsletter subscription, and bottom-bar content.

## File Structure

```
components/footer/
  index.tsx             # Main Footer orchestrator
  brand-link.tsx        # Brand logo and attribution
  footer-bottom.tsx     # Copyright, version, theme toggle
  footer-link-group.tsx # Reusable link group column
  social-links.tsx      # Social link data and footer navigation logic
  social-link-item.tsx  # SocialLinks and SocialLinkItem components
  news-letter.tsx       # Newsletter subscription form
```

## Footer (Main Component)

The `Footer` function component assembles all sub-components into a responsive grid layout. It reads configuration from several hooks:

```tsx
export function Footer() {
    const t = useTranslations();
    const config = useConfig();
    const { categoriesEnabled } = useCategoriesEnabled();
    const { tagsEnabled } = useTagsEnabled();
    const { settings: footerSettings } = useFooterSettings();
    // ...
}
```

The layout uses a 5-column grid on large screens:

- **Left (2 columns):** Brand logo, social links, and optionally the newsletter form.
- **Right (3 columns):** Navigation link groups organized into product, clients, company, and resources sections.

The `FooterBottom` component renders below the main content area.

---

## FooterBottom

Renders the copyright bar with legal links, version display, and an optional theme toggler.

### Props

```ts
interface FooterBottomProps {
    config: Config;
    t: (key: string) => string;
    footerSettings: FooterSettings;
}
```

Features controlled by `footerSettings`:

- `versionEnabled` -- Shows a `VersionDisplay` component with a tooltip.
- `themeSelectorEnabled` -- Renders a `ThemeToggler` component that opens upward.

The copyright line uses `config.copyright_year` and `config.company_name`, falling back to the current year when not configured. Legal links are processed through the `processFooterItems` utility.

---

## Social Links Data and Footer Navigation

The `social-links.tsx` file exports three items:

### socialLinks Array

An array of social link objects filtered to remove entries with empty URLs:

```ts
export const socialLinks = [
    { icon: IconGithub, href: siteConfig.social.github, label: "GitHub", ... },
    { icon: IconX, href: siteConfig.social.x, label: "X", ... },
    { icon: FiLinkedin, href: siteConfig.social.linkedin, label: "LinkedIn", ... },
    // ... facebook, blog, email
].filter((link) => link.href && link.href !== "");
```

### footerNavigation Function

Generates the four-category navigation structure based on feature flags:

```ts
interface FooterNavigationOptions {
    categoriesEnabled?: boolean;
    tagsEnabled?: boolean;
    hasCategories?: boolean;
    hasTags?: boolean;
    hasCollections?: boolean;
    customFooterItems?: CustomNavigationItem[];
}

function footerNavigation(
    t: (key: string) => string,
    options: FooterNavigationOptions
): Record<string, Array<{ label: string; href: string; ... }>>
```

Returns an object with keys: `product`, `clients`, `company`, `resources`. Custom footer items from config are appended to the `resources` section.

### categoryLabels Function

Returns localized labels for each navigation category:

```ts
function categoryLabels(t: (key: string) => string) {
    return {
        product: t("footer.PRODUCT"),
        clients: t("footer.CLIENTS"),
        company: t("footer.COMPANY"),
        resources: t("footer.RESOURCES"),
    };
}
```

---

## Newsletter

A form component using React 19's `useActionState` for server action integration.

```tsx
export function Newsletter({ t }: { t: any }) {
    const [state, formAction, pending] = useActionState(
        subscribeToNewsletter, {}
    );
    // ...
}
```

The form includes an email input and a submit button with a gradient background. On success, a toast notification is displayed via `sonner`. The `pending` state disables the form during submission.

The newsletter section is conditionally rendered based on `footerSettings.subscribeEnabled`.

---

## FooterLinkGroup

A reusable column component for rendering a labeled group of navigation links. Used by the main Footer to render each category (product, clients, company, resources).

Each link supports an optional `target`, `rel`, and `isExternal` flag for external URLs.

---

## Configuration Dependencies

The footer relies on several hooks for dynamic visibility:

| Hook | Controls |
|---|---|
| `useCategoriesEnabled` | Whether category links appear |
| `useTagsEnabled` | Whether tag links appear |
| `useCategoriesExists` | Whether categories actually exist in data |
| `useCollectionsExists` | Whether collections exist in data |
| `useTagsExists` | Whether tags exist in data |
| `useFooterSettings` | Subscribe, version, theme selector toggles |
| `useConfig` | Custom footer items and company info |
