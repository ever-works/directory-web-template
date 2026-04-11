---
id: translation-workflow
title: "Vertaalworkflow"
sidebar_label: "Vertaalworkflow"
sidebar_position: 11
---

# Vertaalworkflow

Het sjabloon gebruikt `next-intl` voor internationalisering (i18n) met JSON-gebaseerde berichtbestanden. De vertaalworkflow zorgt ervoor dat alle ondersteunde locales gesynchroniseerd blijven met het Engelse referentiebestand via een geautomatiseerd synchronisatiescript.

## Ondersteunde locales

Het sjabloon wordt geleverd met 20 ondersteunde talen:

| Code | Taal | Code | Taal |
|---|---|---|---|
| `en` | Engels (referentie) | `ko` | Koreaans |
| `ar` | Arabisch | `nl` | Nederlands |
| `bg` | Bulgaars | `pl` | Pools |
| `de` | Duits | `pt` | Portugees |
| `es` | Spaans | `ru` | Russisch |
| `fr` | Frans | `th` | Thais |
| `he` | Hebreeuws | `tr` | Turks |
| `hi` | Hindi | `uk` | Oekraïens |
| `id` | Indonesisch | `vi` | Vietnamees |
| `it` | Italiaans | `ja` | Japans |

## Bestandsstructuur

```
messages/
├── en.json
├── ar.json
├── nl.json
└── ...
```

## Vertaalsynchronisatiescript

```bash
node scripts/sync-translations.js
```

### Hoe het werkt

De synchronisatie gebruikt een diepe samenvoeging waarbij bestaande vertalingen prioriteit hebben:

```javascript
function deepMerge(target, source) {
  const result = { ...source };
  for (const key in target) {
    if (typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key] || {});
    } else {
      result[key] = target[key]; // Bestaande vertaling wint
    }
  }
  return result;
}
```

## Berichtbestandsformaat

```json
{
  "common": {
    "loading": "Laden...",
    "error": "Er is een fout opgetreden",
    "save": "Opslaan",
    "cancel": "Annuleren"
  },
  "auth": {
    "signIn": "Aanmelden",
    "signOut": "Afmelden"
  }
}
```

## Vertalingen gebruiken in code

### Clientcomponenten

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function LoginButton() {
  const t = useTranslations('auth');
  return <button>{t('signIn')}</button>;
}
```

### Servercomponenten

```tsx
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('common');
  return <h1>{t('loading')}</h1>;
}
```

## Een nieuwe taal toevoegen

### Stap 1: Berichtbestand aanmaken

```bash
cp messages/en.json messages/NEW_LOCALE.json
```

### Stap 2: Locale registreren

Locale-configuratie bijwerken in `i18n/routing.ts` en `next.config.ts`.
