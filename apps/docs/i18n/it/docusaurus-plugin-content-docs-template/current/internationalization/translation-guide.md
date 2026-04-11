---
id: translation-guide
title: Guida alla Traduzione
sidebar_label: Guida alla Traduzione
sidebar_position: 2
---

# Guida alla Traduzione

Questa guida spiega come usare ed estendere il sistema di traduzione multilingue di Ever Works basato su next-intl.

## Lingue Supportate

Ever Works supporta più di 13 lingue:

| Lingua | Codice | Bandiera |
|----------|------|------|
| 🇬🇧 Inglese | `en` | Predefinita |
| 🇫🇷 Francese | `fr` | |
| 🇪🇸 Spagnolo | `es` | |
| 🇩🇪 Tedesco | `de` | |
| 🇨🇳 Cinese | `zh` | |
| 🇸🇦 Arabo | `ar` | Supporto RTL |
| 🇮🇹 Italiano | `it` | |
| 🇵🇹 Portoghese | `pt` | |
| 🇷🇺 Russo | `ru` | |
| 🇳🇱 Olandese | `nl` | |
| 🇵🇱 Polacco | `pl` | |

## Utilizzo

### Nei Componenti React

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('help');

  return (
    <div>
      <h1>{t('PAGE_TITLE')}</h1>
      <p>{t('PAGE_SUBTITLE')}</p>
    </div>
  );
}
```

## Aggiungere Nuove Traduzioni

### Passo 1: Aggiungere chiavi in inglese

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### Passo 2: Tradurre in altre lingue

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Nuova Sezione",
    "NEW_SECTION_DESC": "Descrizione della nuova sezione"
  }
}
```

## Namespace delle Traduzioni

### Comune (`common`)
- Elementi di navigazione
- Azioni comuni (salva, annulla, elimina)

### Autenticazione (`auth`)
- Accesso e registrazione
- Gestione password

### Aiuto (`help`)
- Contenuto del centro assistenza
- Sezioni FAQ

## Best Practice

### 1. Convenzioni di denominazione

```json
{
  // ✅ Buono
  "FAQ_SETUP_TIME": "How long does setup take?",
  
  // ❌ Cattivo
  "FAQ_1": "How long does setup take?"
}
```

### 2. Segnaposti e variabili

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

### 3. Pluralizzazione

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

## Aggiungere una Nuova Lingua

### Passo 1: Creare il file dei messaggi

```bash
cp messages/en.json messages/it.json
```

### Passo 2: Aggiornare la configurazione

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'it'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### Passo 3: Aggiungere l'icona della bandiera

Posizionare il file SVG in `/public/flags/it.svg`

### Passo 4: Tradurre il contenuto

Tradurre tutte le chiavi in `messages/it.json` in italiano

## Strumenti Consigliati

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - Estensione VS Code per la gestione delle traduzioni
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - Editor visuale per le traduzioni
- **[Crowdin](https://crowdin.com/)** - Piattaforma di traduzione collaborativa

## Checklist delle Traduzioni

Quando si aggiungono nuove funzionalità con testo:

- [ ] Aggiungere chiavi in inglese (`en.json`)
- [ ] Tradurre in francese (`fr.json`)
- [ ] Tradurre in spagnolo (`es.json`)
- [ ] Tradurre in tedesco (`de.json`)
