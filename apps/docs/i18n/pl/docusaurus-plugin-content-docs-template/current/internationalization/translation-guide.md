---
id: translation-guide
title: Przewodnik po Tłumaczeniu
sidebar_label: Przewodnik po Tłumaczeniu
sidebar_position: 2
---

# Przewodnik po Tłumaczeniu

Ten przewodnik wyjaśnia jak używać i rozszerzać wielojęzyczny system tłumaczeń Ever Works oparty na next-intl.

## Obsługiwane Języki

Ever Works obsługuje ponad 13 języków:

| Język | Kod | Flaga |
|----------|------|------|
| 🇬🇧 Angielski | `en` | Domyślny |
| 🇫🇷 Francuski | `fr` | |
| 🇪🇸 Hiszpański | `es` | |
| 🇩🇪 Niemiecki | `de` | |
| 🇨🇳 Chiński | `zh` | |
| 🇸🇦 Arabski | `ar` | Obsługa RTL |
| 🇮🇹 Włoski | `it` | |
| 🇵🇹 Portugalski | `pt` | |
| 🇷🇺 Rosyjski | `ru` | |
| 🇳🇱 Holenderski | `nl` | |
| 🇵🇱 Polski | `pl` | |

## Użycie

### W Komponentach React

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

## Dodawanie Nowych Tłumaczeń

### Krok 1: Dodaj klucze po angielsku

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### Krok 2: Przetłumacz na inne języki

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Nowa Sekcja",
    "NEW_SECTION_DESC": "Opis nowej sekcji"
  }
}
```

## Przestrzenie Nazw Tłumaczeń

### Wspólne (`common`)
- Elementy nawigacji
- Typowe akcje (zapisz, anuluj, usuń)

### Uwierzytelnianie (`auth`)
- Logowanie i rejestracja
- Zarządzanie hasłem

### Pomoc (`help`)
- Treść centrum pomocy
- Sekcje FAQ

## Najlepsze Praktyki

### 1. Konwencje Nazewnictwa

```json
{
  // ✅ Dobrze
  "FAQ_SETUP_TIME": "How long does setup take?",
  
  // ❌ Źle
  "FAQ_1": "How long does setup take?"
}
```

### 2. Zmienne i Symbole Zastępcze

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

### 3. Pluralizacja

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

## Dodawanie Nowego Języka

### Krok 1: Utwórz plik wiadomości

```bash
cp messages/en.json messages/pl.json
```

### Krok 2: Zaktualizuj konfigurację

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'pl'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### Krok 3: Dodaj ikonę flagi

Umieść plik SVG w `/public/flags/pl.svg`

### Krok 4: Przetłumacz treść

Przetłumacz wszystkie klucze w `messages/pl.json` na język polski

## Polecane Narzędzia

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - Rozszerzenie VS Code do zarządzania tłumaczeniami
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - Wizualny edytor tłumaczeń
- **[Crowdin](https://crowdin.com/)** - Współpracownicza platforma tłumaczeń

## Lista Kontrolna Tłumaczeń

Przy dodawaniu nowych funkcji z tekstem:

- [ ] Dodać klucze po angielsku (`en.json`)
- [ ] Przetłumaczyć na francuski (`fr.json`)
- [ ] Przetłumaczyć na hiszpański (`es.json`)
- [ ] Przetłumaczyć na niemiecki (`de.json`)
