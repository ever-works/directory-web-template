---
id: translation-guide
title: Translation Guide
sidebar_label: Translation Guide
sidebar_position: 2
---

# Translation Guide

This guide explains how to use and extend Ever Works' multilingual translation system powered by next-intl.

## Supported Languages

Ever Works supports 13+ languages out of the box:

| Language | Code | Flag |
|----------|------|------|
| 🇬🇧 English | `en` | Default |
| 🇫🇷 French | `fr` | |
| 🇪🇸 Spanish | `es` | |
| 🇩🇪 German | `de` | |
| 🇨🇳 Chinese | `zh` | |
| 🇸🇦 Arabic | `ar` | RTL support |
| 🇮🇹 Italian | `it` | |
| 🇵🇹 Portuguese | `pt` | |
| 🇯🇵 Japanese | `ja` | |
| 🇰🇷 Korean | `ko` | |
| 🇷🇺 Russian | `ru` | |
| 🇳🇱 Dutch | `nl` | |
| 🇵🇱 Polish | `pl` | |

## Usage

### In React Components

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('help'); // 'help' is the namespace

  return (
    <div>
      <h1>{t('PAGE_TITLE')}</h1>
      <p>{t('PAGE_SUBTITLE')}</p>
    </div>
  );
}
```

### Translation File Structure

Translation files are located in the `/messages` folder:

```
messages/
├── en.json    # English (default)
├── fr.json    # French
├── es.json    # Spanish
├── de.json    # German
├── zh.json    # Chinese
├── ar.json    # Arabic
└── ...        # Other languages
```

### JSON Format

```json
{
  "help": {
    "PAGE_TITLE": "Help Center",
    "PAGE_SUBTITLE": "Complete guide to using Ever Works",
    "SECTION": {
      "NESTED_KEY": "Nested translation"
    }
  }
}
```

## Adding New Translations

### Step 1: Add Keys in English

Open `messages/en.json` and add your new keys:

```json
{
  "help": {
    // ... existing translations ...
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### Step 2: Translate to Other Languages

#### French (`messages/fr.json`)

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Nouvelle Section",
    "NEW_SECTION_DESC": "Description de la nouvelle section"
  }
}
```

#### Spanish (`messages/es.json`)

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Nueva Sección",
    "NEW_SECTION_DESC": "Descripción de la nueva sección"
  }
}
```

## Translation Namespaces

### Common (`common`)

- Navigation elements
- Common actions (save, cancel, delete)
- General messages

### Auth (`auth`)

- Login and registration
- Password management
- Authentication errors

### Help (`help`)

- Help center content
- FAQ sections
- Support information

### Pricing (`pricing`)

- Pricing plans
- Feature lists
- Billing information

### Submit (`submit`)

- Form labels and placeholders
- Validation messages
- Success/error messages

## Best Practices

### 1. Naming Conventions

Use descriptive, uppercase keys with underscores:

```json
{
  // ✅ Good
  "FAQ_SETUP_TIME": "How long does setup take?",
  "FORM_ERROR_EMAIL": "Invalid email address",
  
  // ❌ Bad
  "FAQ_1": "How long does setup take?",
  "ERROR1": "Invalid email address"
}
```

### 2. Placeholders and Variables

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

Usage:

```typescript
t('WELCOME_MESSAGE', { name: 'John' })
t('ITEMS_COUNT', { count: 5 })
```

### 3. Pluralization

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

Usage:

```typescript
t('ITEMS', { count: 0 })  // "No items"
t('ITEMS', { count: 1 })  // "1 item"
t('ITEMS', { count: 5 })  // "5 items"
```

### 4. Rich Text Formatting

```json
{
  "TERMS": "By signing up, you agree to our <link>Terms of Service</link>"
}
```

Usage:

```typescript
t.rich('TERMS', {
  link: (chunks) => <Link href="/terms">{chunks}</Link>
})
```

## Adding a New Language

### Step 1: Create Message File

```bash
# Copy English file as template
cp messages/en.json messages/it.json  # Example for Italian
```

### Step 2: Update Configuration

In `i18n/routing.ts`:

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'it'],  // Add 'it'
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### Step 3: Add Flag Icon

Place the SVG file in `/public/flags/it.svg`

### Step 4: Translate Content

Translate all keys in `messages/it.json` to Italian

### Step 5: Test

```bash
# Start dev server
npm run dev

# Visit the new locale
http://localhost:3000/it
```

## Checking Missing Translations

### Verification Script

```bash
# Compare keys between English and French
diff <(jq -r 'paths(scalars) as $p | $p | join(".")' messages/en.json | sort) \
     <(jq -r 'paths(scalars) as $p | $p | join(".")' messages/fr.json | sort)
```

### Recommended Tools

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - VS Code extension for managing translations
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - Visual translation editor
- **[Crowdin](https://crowdin.com/)** - Collaborative translation platform

## RTL Support (Arabic)

Ever Works includes built-in RTL (Right-to-Left) support for Arabic:

```typescript
// Automatically applied based on locale
<html dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

### Testing RTL

1. Switch to Arabic locale
2. Verify layout mirrors correctly
3. Check text alignment
4. Test navigation and forms

## Translation Checklist

When adding new features with text:

- [ ] Add keys in English (`en.json`)
- [ ] Translate to French (`fr.json`)
- [ ] Translate to Spanish (`es.json`)
- [ ] Translate to German (`de.json`)
- [ ] Translate to Chinese (`zh.json`)
- [ ] Translate to Arabic (`ar.json`)
- [ ] Translate to other supported languages
- [ ] Test in all languages
- [ ] Check RTL for Arabic
- [ ] Document new keys

## Troubleshooting

### Missing Translation Warning

**Issue**: Console shows "Missing translation" warning

**Solution**: Add the missing key to all language files

```json
// Add to all messages/*.json files
{
  "namespace": {
    "MISSING_KEY": "Translation text"
  }
}
```

### Translation Not Updating

**Issue**: Changes to translation files not reflecting

**Solution**: Restart the development server

```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

### Locale Not Switching

**Issue**: Language switcher doesn't change locale

**Solution**: Verify routing configuration

```typescript
// Check i18n/routing.ts
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', ...],  // Ensure locale is listed
  defaultLocale: 'en'
});
```

## Professional Translation Services

For legal or sensitive content, consider professional services:

- **[DeepL](https://www.deepl.com/)** - High-quality AI translation
- **[Gengo](https://gengo.com/)** - Professional human translators
- **[Smartling](https://www.smartling.com/)** - Enterprise translation platform

## Contributing Translations

To contribute translations:

1. Fork the repository
2. Create a branch: `git checkout -b translation/my-language`
3. Add/modify translations in `messages/`
4. Test thoroughly
5. Submit a Pull Request

## Next Steps

- [Internationalization Overview](/internationalization) - Learn about i18n architecture
- [Customization](/guides/customization) - Customize your directory
- [Development](/development/local-setup) - Set up development environment

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [ICU Message Format](https://formatjs.io/docs/core-concepts/icu-syntax/)
- [CLDR Pluralization Rules](https://cldr.unicode.org/index/cldr-spec/plural-rules)
- [W3C Internationalization](https://www.w3.org/International/)
