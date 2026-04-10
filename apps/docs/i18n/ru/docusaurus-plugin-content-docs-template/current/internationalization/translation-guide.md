---
id: translation-guide
title: Руководство по Переводу
sidebar_label: Руководство по Переводу
sidebar_position: 2
---

# Руководство по Переводу

Это руководство объясняет как использовать и расширять многоязычную систему переводов Ever Works на основе next-intl.

## Поддерживаемые языки

Ever Works поддерживает более 13 языков:

| Язык | Код | Флаг |
|----------|------|------|
| 🇬🇧 Английский | `en` | По умолчанию |
| 🇫🇷 Французский | `fr` | |
| 🇪🇸 Испанский | `es` | |
| 🇩🇪 Немецкий | `de` | |
| 🇨🇳 Китайский | `zh` | |
| 🇸🇦 Арабский | `ar` | Поддержка RTL |
| 🇮🇹 Итальянский | `it` | |
| 🇵🇹 Португальский | `pt` | |
| 🇷🇺 Русский | `ru` | |
| 🇳🇱 Нидерландский | `nl` | |
| 🇵🇱 Польский | `pl` | |

## Использование

### В React-компонентах

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

## Добавление новых переводов

### Шаг 1: Добавить ключи на английском

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### Шаг 2: Перевести на другие языки

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Новый раздел",
    "NEW_SECTION_DESC": "Описание нового раздела"
  }
}
```

## Пространства имён переводов

### Общее (`common`)
- Элементы навигации
- Типичные действия (сохранить, отменить, удалить)

### Аутентификация (`auth`)
- Вход и регистрация
- Управление паролем

### Помощь (`help`)
- Контент центра помощи
- Разделы FAQ

## Лучшие практики

### 1. Соглашения по именованию

```json
{
  // ✅ Хорошо
  "FAQ_SETUP_TIME": "How long does setup take?",
  
  // ❌ Плохо
  "FAQ_1": "How long does setup take?"
}
```

### 2. Переменные и заполнители

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

### 3. Склонение

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

## Добавление нового языка

### Шаг 1: Создать файл сообщений

```bash
cp messages/en.json messages/ru.json
```

### Шаг 2: Обновить конфигурацию

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'ru'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### Шаг 3: Добавить иконку флага

Разместить SVG-файл в `/public/flags/ru.svg`

### Шаг 4: Перевести контент

Перевести все ключи в `messages/ru.json` на русский язык

## Рекомендуемые инструменты

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - Расширение VS Code для управления переводами
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - Визуальный редактор переводов
- **[Crowdin](https://crowdin.com/)** - Платформа совместных переводов

## Контрольный список переводов

При добавлении новых функций с текстом:

- [ ] Добавить ключи на английском (`en.json`)
- [ ] Перевести на французский (`fr.json`)
- [ ] Перевести на испанский (`es.json`)
- [ ] Перевести на немецкий (`de.json`)
