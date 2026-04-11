---
id: vercel
title: Развертывание на Vercel
sidebar_label: Vercel
sidebar_position: 3
---

# Развертывание на Vercel

Разверните свой сайт-каталог Ever Works на Vercel для быстрой глобальной дистрибуции.

## Требования

- Аккаунт Vercel
- GitHub репозиторий с вашим проектом Ever Works

## Быстрое Развёртывание

### 1. Подключить Репозиторий

1. Посетите [vercel.com](https://vercel.com)
2. Нажмите «New Project»
3. Импортируйте ваш GitHub репозиторий
4. Выберите папку `website` в качестве корневой директории

### 2. Настроить Параметры Сборки

Vercel автоматически определит Next.js. Проверьте эти настройки:

- **Framework Preset**: Next.js
- **Корневая Директория**: `website`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. Переменные Окружения

Добавьте переменные окружения в панели Vercel:

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

### 4. Развернуть

Нажмите «Deploy», и Vercel автоматически соберёт и развернёт ваш сайт.

## Пользовательский Домен

### 1. Добавить Домен

В панели вашего проекта Vercel:
1. Перейдите в «Settings» → «Domains»
2. Добавьте ваш пользовательский домен
3. Следуйте инструкциям по настройке DNS

### 2. SSL Сертификат

Vercel автоматически предоставляет SSL сертификаты для всех доменов.

## Расширенная Конфигурация

### Конфигурационный Файл Vercel

Создайте `vercel.json` в корневой директории проекта:

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

### Оптимизация Сборки

Оптимизируйте вашу сборку для Vercel:

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

## Мониторинг и Аналитика

### Vercel Analytics

Включите Vercel Analytics в вашем проекте:

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

### Мониторинг Производительности

Отслеживайте производительность вашего развёртывания:
- Core Web Vitals
- Время выполнения функций
- Производительность сборки

## Устранение Неполадок

### Распространённые Проблемы

1. **Ошибки Сборки**: Проверьте логи сборки в панели Vercel
2. **Переменные Окружения**: Убедитесь, что все необходимые переменные настроены
3. **Проблемы с Доменом**: Проверьте конфигурацию DNS

### Режим Отладки

Включите режим отладки для подробных логов:

```bash
# In your environment variables
DEBUG=1
```

## Следующие Шаги

- [Переменные Окружения](/docs/deployment/environment-variables) - Настройте своё развёртывание
- [Мониторинг](/docs/deployment/monitoring) - Отслеживайте своё приложение
- [Поддержка](/docs/advanced-guide/support) - Получите помощь с развёртыванием
