---
id: translation-guide
title: Ръководство за Превод
sidebar_label: Ръководство за Превод
sidebar_position: 2
---

# Ръководство за Превод

Това ръководство обяснява как да използвате и разширявате многоезичната система за преводи на Ever Works, базирана на next-intl.

## Поддържани езици

Ever Works поддържа над 13 езика:

| Език | Код | Флаг |
|----------|------|------|
| 🇬🇧 Английски | `en` | По подразбиране |
| 🇫🇷 Френски | `fr` | |
| 🇪🇸 Испански | `es` | |
| 🇩🇪 Немски | `de` | |
| 🇨🇳 Китайски | `zh` | |
| 🇸🇦 Арабски | `ar` | Поддръжка RTL |
| 🇮🇹 Италиански | `it` | |
| 🇵🇹 Португалски | `pt` | |
| 🇷🇺 Руски | `ru` | |
| 🇳🇱 Нидерландски | `nl` | |
| 🇵🇱 Полски | `pl` | |

## Използване

### В React компоненти

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

## Добавяне на нови преводи

### Стъпка 1: Добавете ключове на английски

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### Стъпка 2: Преведете на другите езици

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Нов раздел",
    "NEW_SECTION_DESC": "Описание на новия раздел"
  }
}
```

## Пространства от имена за преводи

### Общо (`common`)
- Елементи на навигацията
- Типични действия (запази, откажи, изтрий)

### Удостоверяване (`auth`)
- Влизане и регистрация
- Управление на парола

### Помощ (`help`)
- Съдържание на центъра за помощ
- Раздели с FAQ

## Добри практики

### 1. Правила за именуване

```json
{
  // ✅ Добре
  "FAQ_SETUP_TIME": "How long does setup take?",
  
  // ❌ Лошо
  "FAQ_1": "How long does setup take?"
}
```

### 2. Променливи и заместители

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

### 3. Множествено число

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

## Добавяне на нов език

### Стъпка 1: Създайте файл с съобщения

```bash
cp messages/en.json messages/bg.json
```

### Стъпка 2: Обновете конфигурацията

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'bg'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### Стъпка 3: Добавете иконка на флаг

Поставете SVG файл в `/public/flags/bg.svg`

### Стъпка 4: Преведете съдържанието

Преведете всички ключове в `messages/bg.json` на български

## Препоръчани инструменти

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - Разширение за VS Code за управление на преводи
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - Визуален редактор за преводи
- **[Crowdin](https://crowdin.com/)** - Платформа за съвместни преводи

## Контролен списък за преводи

При добавяне на нови функции с текст:

- [ ] Добавете ключове на английски (`en.json`)
- [ ] Преведете на френски (`fr.json`)
- [ ] Преведете на испански (`es.json`)
- [ ] Преведете на немски (`de.json`)
