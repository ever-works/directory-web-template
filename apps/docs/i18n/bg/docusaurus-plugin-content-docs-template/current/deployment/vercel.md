---
id: vercel
title: Внедряване във Vercel
sidebar_label: Vercel
sidebar_position: 3
---

# Внедряване във Vercel

Внедрете своя сайт-директория Ever Works в Vercel за бърза глобална дистрибуция.

## Изисквания

- Акаунт в Vercel
- GitHub хранилище с вашия проект Ever Works

## Бързо Внедряване

### 1. Свързване на Хранилището

1. Посетете [vercel.com](https://vercel.com)
2. Кликнете „New Project"
3. Импортирайте вашето GitHub хранилище
4. Изберете папката `website` като коренна директория

### 2. Конфигуриране на Настройките за Сборка

Vercel автоматично ще разпознае Next.js. Проверете тези настройки:

- **Framework Preset**: Next.js
- **Коренна Директория**: `website`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. Променливи на Средата

Добавете вашите променливи на средата в таблото на Vercel:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=your-database-url

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.vercel.app

# OAuth Providers (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Внедряване

Кликнете „Deploy" и Vercel автоматично ще изгради и внедри вашия сайт.

## Персонализиран Домейн

### 1. Добавяне на Домейн

В таблото на вашия проект Vercel:
1. Отидете в „Settings" → „Domains"
2. Добавете вашия персонализиран домейн
3. Следвайте инструкциите за конфигуриране на DNS

### 2. SSL Сертификат

Vercel автоматично предоставя SSL сертификати за всички домейни.

## Разширена Конфигурация

### Конфигурационен Файл на Vercel

Създайте `vercel.json` в коренната директория на проекта:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "website/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/website/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Оптимизация на Сборката

Оптимизирайте вашата сборка за Vercel:

```javascript
// next.config.js
module.exports = {
  // Enable static optimization
  output: 'standalone',
  
  // Optimize images
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable compression
  compress: true,
}
```

## Мониторинг и Анализи

### Vercel Analytics

Активирайте Vercel Analytics в проекта си:

```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### Мониторинг на Производителността

Наблюдавайте производителността на вашето внедряване:
- Core Web Vitals
- Времена за изпълнение на функции
- Производителност на сборката

## Отстраняване на Проблеми

### Чести Проблеми

1. **Грешки при Сборката**: Проверете логовете за сборка в таблото на Vercel
2. **Променливи на Средата**: Уверете се, че всички необходими променливи са зададени
3. **Проблеми с Домейна**: Проверете конфигурацията на DNS

### Режим на Отстраняване на Грешки

Активирайте режима за отстраняване на грешки за подробни логове:

```bash
# In your environment variables
DEBUG=1
```

## Следващи Стъпки

- [Променливи на Средата](/docs/deployment/environment-variables) - Конфигурирайте вашето внедряване
- [Мониторинг](/docs/deployment/monitoring) - Наблюдавайте приложението си
- [Поддръжка](/docs/advanced-guide/support) - Получете помощ с внедряването
