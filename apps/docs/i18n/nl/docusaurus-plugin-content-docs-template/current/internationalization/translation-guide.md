---
id: translation-guide
title: Vertaalhandleiding
sidebar_label: Vertaalhandleiding
sidebar_position: 2
---

# Vertaalhandleiding

Deze handleiding legt uit hoe u Ever Works' meertalige vertaalsysteem aangedreven door next-intl kunt gebruiken en uitbreiden.

## Ondersteunde Talen

Ever Works ondersteunt 13+ talen direct:

| Taal | Code | Vlag |
|----------|------|------|
| 🇬🇧 Engels | `en` | Standaard |
| 🇫🇷 Frans | `fr` | |
| 🇪🇸 Spaans | `es` | |
| 🇩🇪 Duits | `de` | |
| 🇨🇳 Chinees | `zh` | |
| 🇸🇦 Arabisch | `ar` | RTL-ondersteuning |
| 🇮🇹 Italiaans | `it` | |
| 🇵🇹 Portugees | `pt` | |
| 🇯🇵 Japans | `ja` | |
| 🇰🇷 Koreaans | `ko` | |
| 🇷🇺 Russisch | `ru` | |
| 🇳🇱 Nederlands | `nl` | |
| 🇵🇱 Pools | `pl` | |

## Gebruik

### In React-componenten

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

### Vertaalbestandstructuur

```
messages/
├── en.json    # Engels (standaard)
├── fr.json    # Frans
├── es.json    # Spaans
├── de.json    # Duits
├── zh.json    # Chinees
├── ar.json    # Arabisch
└── ...        # Andere talen
```

## Nieuwe Vertalingen Toevoegen

### Stap 1: Sleutels in het Engels toevoegen

`messages/en.json` openen en nieuwe sleutels toevoegen:

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### Stap 2: Vertalen naar andere talen

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Nouvelle Section",
    "NEW_SECTION_DESC": "Description de la nouvelle section"
  }
}
```

## Vertaalnamespaces

### Algemeen (`common`)
- Navigatie-elementen
- Algemene acties (opslaan, annuleren, verwijderen)

### Authenticatie (`auth`)
- Aanmelden en registreren
- Wachtwoordbeheer

### Hulp (`help`)
- Helpcentrum-inhoud
- FAQ-secties

### Prijzen (`pricing`)
- Prijsplannen
- Functielijsten

## Best Practices

### 1. Naamgevingsconventies

```json
{
  // ✅ Goed
  "FAQ_SETUP_TIME": "How long does setup take?",
  "FORM_ERROR_EMAIL": "Invalid email address",
  
  // ❌ Slecht
  "FAQ_1": "How long does setup take?",
  "ERROR1": "Invalid email address"
}
```

### 2. Plaatshouders en variabelen

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

### 3. Meervoudsvormen

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

### 4. Rijke tekstopmaak

```json
{
  "TERMS": "By signing up, you agree to our <link>Terms of Service</link>"
}
```

## Nieuwe Taal Toevoegen

### Stap 1: Berichtenbestand aanmaken

```bash
cp messages/en.json messages/it.json
```

### Stap 2: Configuratie bijwerken

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'it'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### Stap 3: Vlagpictogram toevoegen

SVG-bestand plaatsen in `/public/flags/it.svg`

### Stap 4: Inhoud vertalen

Alle sleutels in `messages/it.json` naar Italiaans vertalen

## Ontbrekende Vertalingen Controleren

### Verificatiescript

```bash
diff <(jq -r 'paths(scalars) as $p | $p | join(".")' messages/en.json | sort) \
     <(jq -r 'paths(scalars) as $p | $p | join(".")' messages/fr.json | sort)
```

### Aanbevolen Hulpmiddelen

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - VS Code-extensie voor het beheren van vertalingen
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - Visuele vertaaleditor
- **[Crowdin](https://crowdin.com/)** - Collaboratief vertaalplatform

## Vertaalchecklist

Bij het toevoegen van nieuwe functies met tekst:

- [ ] Sleutels toevoegen in het Engels (`en.json`)
- [ ] Vertalen naar Frans (`fr.json`)
- [ ] Vertalen naar Spaans (`es.json`)
- [ ] Vertalen naar Duits (`de.json`)
