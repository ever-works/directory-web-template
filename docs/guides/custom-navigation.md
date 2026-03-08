---
id: custom-navigation
title: Custom Navigation Links Configuration
sidebar_label: Custom Navigation
sidebar_position: 3
---

# Custom Navigation Links Configuration

This documentation explains how to configure custom links in the header (main menu) and footer of your site via the `config.yml` file.

## Overview

Custom links allow administrators to add custom navigation elements without modifying the source code. You can configure:

- **Header menu items**: Links that appear in the main navigation menu at the top of the page
- **Footer links**: Links that appear in the site footer

These links support:
- ✅ Internal navigation (application routes)
- ✅ Markdown pages (`.md` files in `.content/pages/`)
- ✅ External URLs (open in a new tab)
- ✅ i18n translations (translation keys)

## Configuration in config.yml

The `config.yml` file is located in the `.content/` directory of your data repository (configured via `DATA_REPOSITORY`).

### Basic Structure

Add the following sections to your `config.yml`:

```yaml
# Custom links for the header (main menu)
custom_header:
  - label: "About"
    path: "/about"
  - label: "Documentation"
    path: "/pages/docs"
  - label: "Blog"
    path: "https://blog.example.com"

# Custom links for the footer
custom_footer:
  - label: "Privacy Policy"
    path: "/pages/privacy-policy"
  - label: "Terms of Service"
    path: "/terms"
  - label: "GitHub"
    path: "https://github.com/example"
```

## Link Types

### 1. Internal Links (Application Routes)

Relative paths starting with `/` are treated as internal application routes.

**Example:**
```yaml
custom_header:
  - label: "About"
    path: "/about"
  - label: "Collections"
    path: "/collections"
  - label: "Pricing"
    path: "/pricing"
```

These links use Next.js client-side navigation (same tab, fast navigation).

### 2. Markdown Pages (.content/pages/ files)

Paths starting with `/pages/` point to markdown files in `.content/pages/`.

**Example:**
```yaml
custom_header:
  - label: "Documentation"
    path: "/pages/docs"
  - label: "Guide"
    path: "/pages/user-guide"
```

This will look for the file `.content/pages/docs.md` (or `docs.{locale}.md` for translations).

**File structure:**
```
.content/
  └── pages/
      ├── docs.en.md      # English version
      ├── docs.fr.md      # French version
      ├── user-guide.md   # Default version
      └── privacy-policy.md
```

**Markdown file format:**
```markdown
---
title: "Documentation"
description: "Complete application guide"
lastUpdated: "2025-01-15"
---

# Documentation

Your page content...
```

### 3. External URLs

URLs starting with `http://` or `https://` are treated as external links.

**Example:**
```yaml
custom_header:
  - label: "Blog"
    path: "https://blog.example.com"
  - label: "GitHub"
    path: "https://github.com/your-org/your-repo"
  - label: "Documentation"
    path: "https://docs.example.com"
```

**Behavior:**
- ✅ Open in a **new tab** (`target="_blank"`)
- ✅ Include `rel="noopener noreferrer"` for security
- ✅ Display an external link indicator icon

## Translation Support (i18n)

Labels can use translation keys instead of plain text.

### Translation Key Format

Translation keys must be in **UPPERCASE** with **underscores**:
- ✅ `NAV_ABOUT`
- ✅ `FOOTER_PRIVACY_POLICY`
- ✅ `COMMON_DOCUMENTATION`
- ❌ `nav_about` (lowercase)
- ❌ `Nav About` (spaces)

### Example with Translations

```yaml
custom_header:
  - label: "NAV_ABOUT"
    path: "/about"
  - label: "NAV_DOCUMENTATION"
    path: "/pages/docs"

custom_footer:
  - label: "FOOTER_PRIVACY_POLICY"
    path: "/pages/privacy-policy"
  - label: "FOOTER_TERMS"
    path: "/terms"
```

The system will search for the translation in the following namespaces (in order):
1. `common`
2. `footer`
3. `auth`
4. `listing`
5. `survey`
6. `help`

### Adding Translations

In your translation files (for example `messages/fr.json`, `messages/en.json`):

```json
{
  "common": {
    "NAV_ABOUT": "About",
    "NAV_DOCUMENTATION": "Documentation"
  },
  "footer": {
    "FOOTER_PRIVACY_POLICY": "Privacy Policy",
    "FOOTER_TERMS": "Terms of Service"
  }
}
```

**If the translation is not found**, the system will use the key as default text.

## Complete Examples

### Example 1: Basic Configuration

```yaml
company_name: "Acme Inc"
copyright_year: 2025

custom_header:
  - label: "About"
    path: "/about"
  - label: "Contact"
    path: "/contact"
  - label: "Blog"
    path: "https://blog.acme.com"

custom_footer:
  - label: "Privacy Policy"
    path: "/pages/privacy-policy"
  - label: "Terms of Service"
    path: "/pages/terms-of-service"
  - label: "GitHub"
    path: "https://github.com/acme/website"
```

### Example 2: With i18n Translations

```yaml
company_name: "Acme Inc"

custom_header:
  - label: "NAV_HOME"
    path: "/"
  - label: "NAV_ABOUT"
    path: "/about"
  - label: "NAV_DOCS"
    path: "/pages/docs"
  - label: "NAV_BLOG"
    path: "https://blog.acme.com"

custom_footer:
  - label: "FOOTER_LEGAL"
    path: "/legal"
  - label: "FOOTER_PRIVACY"
    path: "/pages/privacy-policy"
  - label: "FOOTER_CONTACT"
    path: "/contact"
  - label: "FOOTER_GITHUB"
    path: "https://github.com/acme"
```

With translations in `messages/fr.json`:

```json
{
  "common": {
    "NAV_HOME": "Accueil",
    "NAV_ABOUT": "À propos",
    "NAV_DOCS": "Documentation",
    "NAV_BLOG": "Blog"
  },
  "footer": {
    "FOOTER_LEGAL": "Légal",
    "FOOTER_PRIVACY": "Confidentialité",
    "FOOTER_CONTACT": "Contact",
    "FOOTER_GITHUB": "GitHub"
  }
}
```

### Example 3: Mixed (Plain Text and Translations)

```yaml
custom_header:
  - label: "Home"
    path: "/"
  - label: "NAV_ABOUT"
    path: "/about"
  - label: "Documentation"
    path: "/pages/docs"
  - label: "Blog"
    path: "https://blog.example.com"
```

## Display Order

Custom links are **added after** the system's default links:

### Header
1. Default links (Home, Collections, Categories, Tags, Surveys, Pricing, Submit, etc.)
2. Custom links from `custom_header` (in the defined order)

### Footer
Custom links are added to the **"Resources"** section of the footer, after the default links.

## Validation and Error Handling

The system automatically validates each entry:

- ✅ Checks that each item has `label` and `path`
- ✅ Ignores invalid entries (with a warning in the console)
- ✅ Continues to function even if some entries are invalid

**Example of invalid entry (ignored):**
```yaml
custom_header:
  - label: "Valid Link"
    path: "/about"
  - label: "Invalid"  # Missing 'path' field - will be ignored
  - path: "/contact"  # Missing 'label' field - will be ignored
```

## Deployment and Updates

### Recommended Workflow

1. **Modify config.yml** in your data repository (`.content/config.yml`)
2. **Commit and push** changes to the repository
3. **Automatic synchronization**: The system syncs periodically or on the next build
4. **Revalidation**: Changes are applied after cache revalidation

### Local Testing

To test locally:

```bash
# 1. Modify .content/config.yml
nano .content/config.yml

# 2. Restart the development server
pnpm dev

# Or rebuild for production
pnpm build
pnpm start
```

## Troubleshooting

### Links Don't Appear

1. **Check YAML syntax**: Make sure indentation is correct (2 spaces)
2. **Check field names**: Use `label` and `path` (not `text` or `url`)
3. **Check format**: Entries must be in an array (`-`)
4. **Restart the server**: Changes require a restart

### Translations Don't Work

1. **Check key format**: Must be UPPERCASE with underscores
2. **Check namespace**: The key must exist in one of the supported namespaces
3. **Check translation files**: Make sure the key exists in `messages/{locale}.json`
4. **Fallback**: If the translation doesn't exist, the key will be used as text

### Markdown Pages Don't Display

1. **Check path**: The file must be in `.content/pages/`
2. **Check name**: The slug in the URL must match the file name
3. **File format**: Use `.md` or `.{locale}.md` for translations
4. **Markdown syntax**: The file must be valid markdown

## Best Practices

### 1. Use Translations for Multi-language

```yaml
# ✅ Good
custom_header:
  - label: "NAV_ABOUT"
    path: "/about"

# ❌ Less flexible
custom_header:
  - label: "About"
    path: "/about"
```

### 2. Organize Links Logically

```yaml
# ✅ Logical order
custom_header:
  - label: "NAV_HOME"
    path: "/"
  - label: "NAV_ABOUT"
    path: "/about"
  - label: "NAV_DOCS"
    path: "/pages/docs"

# ❌ Confusing order
custom_header:
  - label: "NAV_DOCS"
    path: "/pages/docs"
  - label: "NAV_HOME"
    path: "/"
  - label: "NAV_ABOUT"
    path: "/about"
```

### 3. Separate Internal and External Links

```yaml
custom_header:
  # Internal links
  - label: "NAV_ABOUT"
    path: "/about"
  - label: "NAV_DOCS"
    path: "/pages/docs"
  
  # External links
  - label: "NAV_BLOG"
    path: "https://blog.example.com"
  - label: "NAV_GITHUB"
    path: "https://github.com/example"
```

### 4. Keep Labels Short

```yaml
# ✅ Good (short and clear)
custom_header:
  - label: "NAV_ABOUT"
  - label: "NAV_DOCS"
  - label: "NAV_BLOG"

# ❌ Avoid (too long)
custom_header:
  - label: "NAV_ABOUT_OUR_COMPANY_AND_MISSION"
  - label: "NAV_READ_OUR_COMPREHENSIVE_DOCUMENTATION"
```

## Quick Reference

| Link Type | Path Format | Behavior |
|-----------|-------------|----------|
| Internal route | `/about`, `/collections` | Client-side navigation (same tab) |
| Markdown page | `/pages/docs`, `/pages/privacy` | Displays content from `.content/pages/{slug}.md` |
| External URL | `https://example.com` | Opens in a new tab with security |

| Label Format | Resolution |
|--------------|------------|
| Plain text | `"About"` → Displays "About" |
| Translation key | `"NAV_ABOUT"` → Searches in i18n namespaces |

## Support

For any questions or issues:

1. Check this documentation
2. Review the examples above
3. Check console logs for warnings
4. Contact support if needed

---

**Note**: Changes to `config.yml` require content synchronization or a server restart to be applied.

