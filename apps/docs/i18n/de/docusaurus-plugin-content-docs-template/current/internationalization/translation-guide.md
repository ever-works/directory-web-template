---
id: translation-guide
title: Übersetzungsanleitung
sidebar_label: Übersetzungsanleitung
sidebar_position: 2
---

# Übersetzungsanleitung

Diese Anleitung erklärt, wie das mehrsprachige Übersetzungssystem von Ever Works mithilfe von next-intl verwendet und erweitert werden kann.

## Unterstützte Sprachen

Ever Works unterstützt mehr als 13 Sprachen direkt:

| Sprache | Code | Flagge |
|----------|------|------|
| 🇬🇧 Englisch | `en` | Standard |
| 🇫🇷 Französisch | `fr` | |
| 🇪🇸 Spanisch | `es` | |
| 🇩🇪 Deutsch | `de` | |
| 🇨🇳 Chinesisch | `zh` | |
| 🇸🇦 Arabisch | `ar` | RTL-Unterstützung |
| 🇮🇹 Italienisch | `it` | |
| 🇵🇹 Portugiesisch | `pt` | |
| 🇯🇵 Japanisch | `ja` | |
| 🇰🇷 Koreanisch | `ko` | |
| 🇷🇺 Russisch | `ru` | |
| 🇳🇱 Niederländisch | `nl` | |
| 🇵🇱 Polnisch | `pl` | |

## Verwendung

### In React-Komponenten

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('help'); // 'help' ist der Namespace

  return (
    <div>
      <h1>{t('PAGE_TITLE')}</h1>
      <p>{t('PAGE_SUBTITLE')}</p>
    </div>
  );
}
```

### Übersetzungsdatei-Struktur

Übersetzungsdateien befinden sich im Ordner `/messages`:

```
messages/
├── en.json    # Englisch (Standard)
├── fr.json    # Französisch
├── es.json    # Spanisch
├── de.json    # Deutsch
├── zh.json    # Chinesisch
├── ar.json    # Arabisch
└── ...        # Andere Sprachen
```

### JSON-Format

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

## Neue Übersetzungen hinzufügen

### Schritt 1: Schlüssel auf Englisch hinzufügen

`messages/en.json` öffnen und neue Schlüssel hinzufügen:

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### Schritt 2: In andere Sprachen übersetzen

#### Französisch (`messages/fr.json`)

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Nouvelle Section",
    "NEW_SECTION_DESC": "Description de la nouvelle section"
  }
}
```

#### Spanisch (`messages/es.json`)

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Nueva Sección",
    "NEW_SECTION_DESC": "Descripción de la nueva sección"
  }
}
```

## Übersetzungs-Namespaces

### Allgemein (`common`)

- Navigationselemente
- Allgemeine Aktionen (speichern, abbrechen, löschen)
- Allgemeine Nachrichten

### Authentifizierung (`auth`)

- Anmeldung und Registrierung
- Passwortverwaltung
- Authentifizierungsfehler

### Hilfe (`help`)

- Hilfecenter-Inhalt
- FAQ-Bereiche
- Support-Informationen

### Preise (`pricing`)

- Preispläne
- Funktionslisten
- Abrechnungsinformationen

### Einreichung (`submit`)

- Formularetiketten und Platzhalter
- Validierungsnachrichten
- Erfolgs-/Fehlermeldungen

## Best Practices

### 1. Benennungskonventionen

Beschreibende, großgeschriebene Schlüssel mit Unterstrichen verwenden:

```json
{
  // ✅ Gut
  "FAQ_SETUP_TIME": "How long does setup take?",
  "FORM_ERROR_EMAIL": "Invalid email address",
  
  // ❌ Schlecht
  "FAQ_1": "How long does setup take?",
  "ERROR1": "Invalid email address"
}
```

### 2. Platzhalter und Variablen

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

Verwendung:

```typescript
t('WELCOME_MESSAGE', { name: 'John' })
t('ITEMS_COUNT', { count: 5 })
```

### 3. Pluralformen

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

Verwendung:

```typescript
t('ITEMS', { count: 0 })  // "No items"
t('ITEMS', { count: 1 })  // "1 item"
t('ITEMS', { count: 5 })  // "5 items"
```

### 4. Rich-Text-Formatierung

```json
{
  "TERMS": "By signing up, you agree to our <link>Terms of Service</link>"
}
```

Verwendung:

```typescript
t.rich('TERMS', {
  link: (chunks) => <Link href="/terms">{chunks}</Link>
})
```

## Neue Sprache hinzufügen

### Schritt 1: Nachrichtendatei erstellen

```bash
# Englische Datei als Vorlage kopieren
cp messages/en.json messages/it.json  # Beispiel für Italienisch
```

### Schritt 2: Konfiguration aktualisieren

In `i18n/routing.ts`:

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'it'],  // 'it' hinzufügen
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### Schritt 3: Flaggen-Symbol hinzufügen

SVG-Datei unter `/public/flags/it.svg` ablegen

### Schritt 4: Inhalt übersetzen

Alle Schlüssel in `messages/it.json` ins Italienische übersetzen

### Schritt 5: Testen

```bash
# Entwicklungsserver starten
npm run dev

# Neue Sprachregion besuchen
http://localhost:3000/it
```

## Fehlende Übersetzungen prüfen

### Überprüfungsskript

```bash
# Schlüssel zwischen Englisch und Französisch vergleichen
diff <(jq -r 'paths(scalars) as $p | $p | join(".")' messages/en.json | sort) \
     <(jq -r 'paths(scalars) as $p | $p | join(".")' messages/fr.json | sort)
```

### Empfohlene Werkzeuge

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** – VS Code-Erweiterung zur Verwaltung von Übersetzungen
- **[BabelEdit](https://www.codeandweb.com/babeledit)** – Visueller Übersetzungseditor
- **[Crowdin](https://crowdin.com/)** – Kollaborative Übersetzungsplattform

## RTL-Unterstützung (Arabisch)

Ever Works bietet integrierte RTL (Rechts-nach-Links)-Unterstützung für Arabisch:

```typescript
// Automatisch basierend auf der Sprachregion angewendet
<html dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

### RTL testen

1. Auf arabische Sprachregion wechseln
2. Prüfen, ob das Layout korrekt gespiegelt wird
3. Textausrichtung prüfen
4. Navigation und Formulare testen

## Übersetzungs-Checkliste

Beim Hinzufügen neuer Funktionen mit Text:

- [ ] Schlüssel auf Englisch hinzufügen (`en.json`)
- [ ] Ins Französische übersetzen (`fr.json`)
- [ ] Ins Spanische übersetzen (`es.json`)
- [ ] Ins Deutsche übersetzen (`de.json`)
