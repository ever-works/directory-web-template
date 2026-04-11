---
id: ssl-domains
title: "SSL и Персонализирани Домейни"
sidebar_label: "SSL & Домейни"
sidebar_position: 2
---

# SSL и Персонализирани Домейни

Това ръководство обхваща конфигурацията на персонализирани домейни, управлението на SSL сертификати, конфигурацията на DNS и поддръжката на множество домейни за Ever Works Template. Шаблонът идва с производствени заглавия за сигурност и е оптимизиран за внедряване на Vercel с автоматичен HTTPS, но също поддържа self-hosted среди с ръчна конфигурация на SSL.

## Вградени Заглавия за Сигурност

Шаблонът конфигурира изчерпателен набор от заглавия за сигурност в `next.config.ts`, които се прилагат автоматично към всеки маршрут. Тези заглавия налагат HTTPS, предотвратяват общи уеб атаки и контролират зареждането на ресурси.

### Пълна Конфигурация на Заглавията

Пълният блок заглавия от `next.config.ts`:

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

### Описание на Заглавията

| Заглавие | Стойност | Цел |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Предотвратява атаки при разпознаване на MIME тип |
| `X-Frame-Options` | `DENY` | Блокира clickjacking като предотвратява вграждане в iframe |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Контролира колко информация за referrer се споделя |
| `X-DNS-Prefetch-Control` | `on` | Активира DNS prefetching за по-бързо зареждане |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Налага HTTPS за 2 години на всички поддомейни |
| `Content-Security-Policy` | Вижте по-горе | Ограничава кои ресурси може да зарежда браузърът |

### Детайли на HSTS

Заглавието Strict-Transport-Security използва максималната препоръчителна конфигурация:

- **max-age=63072000** – браузърите помнят да използват HTTPS в продължение на 2 години
- **includeSubDomains** – всички поддомейни също трябва да използват HTTPS
- **preload** – допустим за включване в HSTS preload списъците на браузърите

:::caution
След като HSTS с preload е активен и домейнът ви бъде изпратен в списъка с preload, е много трудно да го отмените. Уверете се, че SSL сертификатът е правилно конфигуриран и с автоматично подновяване преди да активирате preload.
:::

### Описание на Content Security Policy

| Директива | Стойност | Ефект |
|-----------|-------|--------|
| `default-src` | `'self'` | Зареждане само на ресурси от същия произход по подразбиране |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | Скриптове от същия произход, inline скриптове и SDK за плащане LemonSqueezy |
| `style-src` | `'self' 'unsafe-inline'` | Стилове от същия произход плюс inline стилове (необходимо за CSS-in-JS) |
| `img-src` | `'self' data: https:` | Изображения от същия произход, data URI и всеки HTTPS източник |
| `font-src` | `'self'` | Шрифтове само от същия произход |
| `connect-src` | `'self' https:` | API извиквания към същия произход и всяка HTTPS крайна точка |
| `frame-ancestors` | `'none'` | Предотвратява вграждането на страницата в рамки |

## Конфигурация на Персонализиран Домейн

### Променливи на Средата за Конфигурация на Домейн

При конфигуриране на персонализиран домейн, актуализирайте тези променливи в средата за внедряване:

```bash
# URL на приложението – използван за OAuth обратни извиквания, канонични URL, hreflang, сайтмапове
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Домейн на бисквитката – трябва да съответства на вашия домейн за да работят сесийните бисквитки
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# URL за удостоверяване – използван от NextAuth за обратни извиквания
NEXTAUTH_URL=https://yourdomain.com
```

Променливата `NEXT_PUBLIC_APP_URL` е декларирана като критична в `scripts/check-env.js`:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: Автоматичен SSL

При внедряване на Vercel, SSL сертификатите се издават и подновяват автоматично с помощта на Let's Encrypt. Процесът не изисква ръчна конфигурация:

1. **Добавете домейна** в таблото на Vercel проекта в Настройки → Домейни
2. **Конфигурирайте DNS** да сочи към Vercel (вижте Конфигурацията на DNS по-долу)
3. **Проверете** – Vercel автоматично издава сертификата след разрешаване на DNS

Vercel поддържа:

- Автоматично издаване на Let's Encrypt сертификати
- Wildcard сертификати за поддомейни
- Автоматично подновяване на сертификатите преди изтичане
- Пренасочване от HTTP към HTTPS (автоматично)

### Конфигурация на DNS

**За корен домейн** (напр. `example.com`):

```
Тип:  A
Име:  @
Стойност: 76.76.21.21
```

**За поддомейн www** (напр. `www.example.com`):

```
Тип:  CNAME
Ime:  www
Стойност: cname.vercel-dns.com
```

**Проверка на DNS** след задаване на записите:

```bash
# Проверка на A запис
dig yourdomain.com A +short

# Проверка на CNAME запис
dig www.yourdomain.com CNAME +short

# Проверка на разпространение от множество места
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

Разпространението на DNS може да отнеме до 48 часа, въпреки че повечето промени влизат в сила за минути.

### Self-Hosted: Nginx с Let's Encrypt

За self-hosted внедрявания зад Nginx, конфигурирайте SSL терминацията на ниво прокси:

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

Инсталирайте и конфигурирайте Certbot за автоматично управление на сертификатите:

```bash
# Инсталиране на Certbot
sudo apt install certbot python3-certbot-nginx

# Получаване и инсталиране на сертификат
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Проверка на автоматичното подновяване
sudo certbot renew --dry-run
```

## OAuth Обратни Извиквания URL Адреси

При преминаване към персонализиран домейн, актуализирайте URL адресите на обратните извиквания в конзолата на всеки OAuth доставчик:

| Доставчик | URL на Обратното Извикване |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

Шаблонът автоматично валидира OAuth конфигурацията при стартиране. От `auth.config.ts`:

```typescript
const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === 'google')
        ? { enabled: true, clientId: authConfig.google.clientId || '', ... }
        : { enabled: false },
      // ... други доставчици
    });
  } catch (error) {
    // Fallback само към идентификационни данни
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

Ако даден доставчик е неправилно конфигуриран, шаблонът превключва към удостоверяване само с идентификационни данни.

## Поддръжка на Множество Домейни

Шаблонът поддържа множество домейни чрез конфигурацията за оптимизация на изображения на Next.js:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

Помощната програма `generateImageRemotePatterns()` динамично генерира модели за отдалечени изображения, позволявайки на Next.js да оптимизира изображения от конфигурирани външни домейни.

## Конфигурация на Бисквитките

Настройките на бисквитките трябва да бъдат съобразени с конфигурацията на вашия домейн:

```bash
# Разработка (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Производство (персонализиран домейн)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Задаването на `COOKIE_SECURE=true` гарантира, че бисквитките се предават само чрез HTTPS връзки. Това е от съществено значение за предотвратяване на отвличане на сесии. Скриптът за проверка на средата валидира конфигурацията на бисквитките като част от категорията за сигурност.

## Отстраняване на Неизправности

### SSL Сертификатът Не е Издаден

1. Проверете дали DNS записите сочат към правилната цел
2. Деактивирайте всякакъв DNS прокси (напр. прокси режима на Cloudflare), който може да прехваща ACME предизвикателството
3. Изчакайте пълното разпространение на DNS (проверете с командите `dig` по-горе)
4. Прегледайте таблото на платформата за конкретни грешки при сертификата

### Предупреждения за Смесено Съдържание

Ако браузърът отчита смесено съдържание след активиране на HTTPS:

1. Уверете се, че `NEXT_PUBLIC_APP_URL` започва с `https://`
2. Проверете дали всички URL адреси на външни ресурси използват HTTPS
3. CSP директивите `img-src` и `connect-src` включват `https:` по подразбиране

### Несъответствие при OAuth Пренасочване

Ако OAuth входът е неуспешен с грешка за несъответствие на URI за пренасочване:

1. Актуализирайте URL адреса на обратното извикване в конзолата за разработчици на всеки OAuth доставчик
2. Уверете се, че `NEXTAUTH_URL` съответства на точния домейн включително протокола
3. Изчистете бисквитките на браузъра и сесийното хранилище преди повторен опит

## Свързани Файлове

| Файл | Цел |
|------|---------|
| `next.config.ts` | Заглавия за сигурност, CSP, модели за отдалечени изображения |
| `auth.config.ts` | Конфигурация на OAuth доставчик и настройка на обратно извикване |
| `scripts/check-env.js` | Валидация на променливи на средата за конфигурации на домейни |
| `lib/seo/hreflang.ts` | Генериране на алтернативни hreflang линкове за i18n |
| `lib/utils/url-cleaner.ts` | Помощна програма за базов URL използвайки `NEXT_PUBLIC_APP_URL` |
