---
id: translation-workflow
title: "Flusso di Lavoro Traduzione"
sidebar_label: "Flusso di Lavoro Traduzione"
sidebar_position: 11
---

# Flusso di Lavoro Traduzione

Il template usa `next-intl` per l'internazionalizzazione (i18n) con file di messaggi JSON. Il flusso di lavoro della traduzione garantisce che tutte le locale supportate rimangano sincronizzate con il file di riferimento inglese tramite uno script di sincronizzazione automatizzato.

## Locale supportate

Il template viene fornito con 20 lingue supportate:

| Codice | Lingua | Codice | Lingua |
|---|---|---|---|
| `en` | Inglese (riferimento) | `ko` | Coreano |
| `ar` | Arabo | `nl` | Olandese |
| `bg` | Bulgaro | `pl` | Polacco |
| `de` | Tedesco | `pt` | Portoghese |
| `es` | Spagnolo | `ru` | Russo |
| `fr` | Francese | `th` | Thai |
| `he` | Ebraico | `tr` | Turco |
| `hi` | Hindi | `uk` | Ucraino |
| `id` | Indonesiano | `vi` | Vietnamita |
| `it` | Italiano | `ja` | Giapponese |

## Struttura dei file

```
messages/
├── en.json
├── it.json
└── ...
```

## Esecuzione della sincronizzazione

```bash
node scripts/sync-translations.js
```

### Strategia di unione

La sincronizzazione usa una fusione profonda dove le traduzioni esistenti hanno priorità:

```javascript
function deepMerge(target, source) {
  const result = { ...source };
  for (const key in target) {
    if (typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key] || {});
    } else {
      result[key] = target[key]; // La traduzione esistente vince
    }
  }
  return result;
}
```

## Formato del file di messaggi

```json
{
  "common": {
    "loading": "Caricamento...",
    "error": "Si è verificato un errore",
    "save": "Salva",
    "cancel": "Annulla"
  },
  "auth": {
    "signIn": "Accedi",
    "signOut": "Esci"
  }
}
```

## Uso delle traduzioni nel codice

### Componenti client

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function LoginButton() {
  const t = useTranslations('auth');
  return <button>{t('signIn')}</button>;
}
```

### Componenti server

```tsx
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('common');
  return <h1>{t('loading')}</h1>;
}
```

## Aggiunta di una nuova lingua

### Passo 1: Creare il file di messaggi

```bash
cp messages/en.json messages/NEW_LOCALE.json
```

### Passo 2: Registrare la locale

Aggiornare la configurazione della locale in `i18n/routing.ts` e `next.config.ts`.
