---
id: ssl-domains
title: "SSL и Пользовательские Домены"
sidebar_label: "SSL & Домены"
sidebar_position: 2
---

# SSL и Пользовательские Домены

Это руководство охватывает настройку пользовательских доменов, управление SSL-сертификатами, конфигурацию DNS и поддержку нескольких доменов для Ever Works Template. Шаблон поставляется с заголовками безопасности продакшен-уровня и оптимизирован для развёртывания на Vercel с автоматическим HTTPS, но также поддерживает self-hosted окружения с ручной настройкой SSL.

## Встроенные Заголовки Безопасности

Шаблон настраивает комплексный набор заголовков безопасности в `next.config.ts`, которые автоматически применяются к каждому маршруту. Эти заголовки принудительно используют HTTPS, предотвращают распространённые веб-атаки и контролируют загрузку ресурсов.

### Полная Конфигурация Заголовков

Полный блок заголовков из `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';",
        },
      ],
    },
  ];
}
```

### Описание Заголовков

| Заголовок | Значение | Назначение |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Предотвращает атаки через определение MIME-типа |
| `X-Frame-Options` | `DENY` | Блокирует clickjacking, запрещая встраивание в iframe |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Контролирует объём передаваемой информации о реферере |
| `X-DNS-Prefetch-Control` | `on` | Включает DNS prefetching для более быстрой загрузки |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Принудительно использует HTTPS в течение 2 лет на всех поддоменах |
| `Content-Security-Policy` | см. выше | Ограничивает ресурсы, которые может загружать браузер |

### Детали HSTS

Заголовок Strict-Transport-Security использует максимально рекомендуемую конфигурацию:

- **max-age=63072000** – браузеры запоминают использовать HTTPS в течение 2 лет
- **includeSubDomains** – все поддомены также должны использовать HTTPS
- **preload** – подходит для включения в списки HSTS preload браузеров

:::caution
После активации HSTS с preload и включения вашего домена в список preload это очень сложно отменить. Убедитесь, что ваш SSL-сертификат правильно настроен и с автообновлением перед включением preload.
:::

### Описание Content Security Policy

| Директива | Значение | Эффект |
|-----------|-------|--------|
| `default-src` | `'self'` | По умолчанию загружать только ресурсы с того же источника |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | Скрипты с того же источника, inline-скрипты и SDK оплаты LemonSqueezy |
| `style-src` | `'self' 'unsafe-inline'` | Стили с того же источника плюс inline-стили (необходимо для CSS-in-JS) |
| `img-src` | `'self' data: https:` | Изображения с того же источника, data URI и любой HTTPS-источник |
| `font-src` | `'self'` | Шрифты только с того же источника |
| `connect-src` | `'self' https:` | API-вызовы к тому же источнику и любой HTTPS-конечной точке |
| `frame-ancestors` | `'none'` | Запрещает встраивание страницы в фреймы |

## Настройка Пользовательского Домена

### Переменные Окружения для Конфигурации Домена

При настройке пользовательского домена обновите эти переменные в вашем окружении развёртывания:

```bash
# URL приложения – используется для OAuth-колбэков, канонических URL, hreflang, sitemap
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Домен cookie – должен соответствовать вашему домену, чтобы сессионные cookie работали
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# URL аутентификации – используется NextAuth для колбэков
NEXTAUTH_URL=https://yourdomain.com
```

Переменная `NEXT_PUBLIC_APP_URL` объявлена критической в `scripts/check-env.js`:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: Автоматический SSL

При развёртывании на Vercel SSL-сертификаты автоматически выпускаются и обновляются с помощью Let's Encrypt. Процесс не требует ручной настройки:

1. **Добавьте домен** в панели проекта Vercel в Настройки → Домены
2. **Настройте DNS** для указания на Vercel (см. Конфигурацию DNS ниже)
3. **Проверьте** – Vercel автоматически выпустит сертификат после разрешения DNS

Vercel поддерживает:

- Автоматический выпуск сертификатов Let's Encrypt
- Wildcard-сертификаты для поддоменов
- Автоматическое обновление сертификатов до истечения срока
- Перенаправление HTTP на HTTPS (автоматически)

### Конфигурация DNS

**Для корневого домена** (например `example.com`):

```
Тип:  A
Имя:  @
Значение: 76.76.21.21
```

**Для поддомена www** (например `www.example.com`):

```
Тип:  CNAME
Имя:  www
Значение: cname.vercel-dns.com
```

**Проверка DNS** после установки записей:

```bash
# Проверить A-запись
dig yourdomain.com A +short

# Проверить CNAME-запись
dig www.yourdomain.com CNAME +short

# Проверка распространения из нескольких мест
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

Распространение DNS может занять до 48 часов, хотя большинство изменений вступают в силу в течение нескольких минут.

### Self-Hosted: Nginx с Let's Encrypt

Для self-hosted развёртываний за Nginx настройте терминацию SSL на уровне прокси:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Установите и настройте Certbot для автоматической работы с сертификатами:

```bash
# Установить Certbot
sudo apt install certbot python3-certbot-nginx

# Получить и установить сертификат
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Проверить автоматическое обновление
sudo certbot renew --dry-run
```

## URL-адреса Колбэков OAuth

При переходе на пользовательский домен обновите URL-адреса колбэков в консоли каждого OAuth-провайдера:

| Провайдер | URL Колбэка |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

Шаблон автоматически валидирует конфигурацию OAuth при запуске. Из `auth.config.ts`:

```typescript
const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === 'google')
        ? { enabled: true, clientId: authConfig.google.clientId || '', ... }
        : { enabled: false },
      // ... другие провайдеры
    });
  } catch (error) {
    // Fallback к только учётным данным
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

При некорректной конфигурации провайдера шаблон переключается на аутентификацию только по учётным данным.

## Поддержка Нескольких Доменов

Шаблон поддерживает несколько доменов через конфигурацию оптимизации изображений Next.js:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

Утилита `generateImageRemotePatterns()` динамически генерирует паттерны удалённых изображений, позволяя Next.js оптимизировать изображения из настроенных внешних доменов.

## Конфигурация Cookie

Настройки cookie должны соответствовать вашей конфигурации домена:

```bash
# Разработка (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Продакшен (пользовательский домен)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Установка `COOKIE_SECURE=true` гарантирует, что cookie передаются только через HTTPS-соединения. Это необходимо для предотвращения перехвата сессии. Скрипт проверки окружения валидирует конфигурацию cookie в категории безопасности.

## Устранение Неполадок

### SSL-сертификат Не Выпускается

1. Убедитесь, что DNS-записи указывают на правильную цель
2. Отключите любой DNS-прокси (например, режим прокси Cloudflare), который может перехватывать ACME-challenge
3. Дождитесь полного распространения DNS (проверьте командами `dig` выше)
4. Просмотрите панель платформы на наличие конкретных ошибок сертификата

### Предупреждения о Смешанном Контенте

При появлении в браузере предупреждений о смешанном контенте после включения HTTPS:

1. Убедитесь, что `NEXT_PUBLIC_APP_URL` начинается с `https://`
2. Проверьте, что все URL внешних ресурсов используют HTTPS
3. Директивы CSP `img-src` и `connect-src` включают `https:` по умолчанию

### Несоответствие Redirect URI OAuth

При сбое входа через OAuth с ошибкой несоответствия URI перенаправления:

1. Обновите URL колбэка в консоли разработчика каждого OAuth-провайдера
2. Убедитесь, что `NEXTAUTH_URL` соответствует точному домену включая протокол
3. Очистите cookie браузера и хранилище сессии перед повторной попыткой

## Связанные Файлы

| Файл | Назначение |
|------|---------|
| `next.config.ts` | Заголовки безопасности, CSP, паттерны удалённых изображений |
| `auth.config.ts` | Конфигурация OAuth-провайдера и настройка колбэков |
| `scripts/check-env.js` | Валидация переменных окружения для конфигурации домена |
| `lib/seo/hreflang.ts` | Генерация альтернативных hreflang-ссылок для i18n |
| `lib/utils/url-cleaner.ts` | Утилита базового URL с использованием `NEXT_PUBLIC_APP_URL` |
