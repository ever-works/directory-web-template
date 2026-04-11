---
id: security
title: Втвърдяване на сигурността
sidebar_label: сигурност
sidebar_position: 6
---

# Втвърдяване на сигурността

Шаблонът Ever Works включва множество нива на сигурност по подразбиране. Това ръководство документира вградените защити и предоставя препоръки за по-нататъшно укрепване на вашето производствено внедряване.

## Защитни заглавки

Шаблонът конфигурира заглавки за сигурност глобално в `next.config.ts` за всички маршрути:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: "..." },
      ],
    },
  ];
},
```

### Разбивка на заглавката

| Заглавка | Стойност | Цел |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Предотвратява MIME-тип снифинг атаки |
| `X-Frame-Options` | `DENY` | Блокира сайта от вграждане във вградени рамки (защита от щракане) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Ограничава информацията за референт, изпратена до външни източници |
| `X-DNS-Prefetch-Control` | `on` | Активира DNS предварително извличане за производителност |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Налага HTTPS за ~2 години, покрива всички поддомейни, отговаря на условията за списък за предварително зареждане на HSTS |
| `Content-Security-Policy` | Вижте по-долу | Ограничава източниците за зареждане на ресурси |

### Правила за сигурност на съдържанието

CSP е конфигуриран като:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| Директива | Стойност | Бележки |
|---|---|---|
| `default-src` | `'self'` | По подразбиране разрешавайте само ресурси от същия произход |
| `script-src` | `'self' 'unsafe-inline'` + LemonSqueezy | Изисква се за вградени скриптове и джаджа за плащане |
| `style-src` | `'self' 'unsafe-inline'` | Изисква се за CSS-in-JS и Tailwind |
| `img-src` | `'self' data: https:` | Позволява изображения от същия произход, URI адреси на данни и всеки HTTPS източник |
| `font-src` | `'self'` | Само хоствани шрифтове |
| `connect-src` | `'self' https:` | API извиквания към един и същи източник и всяка HTTPS крайна точка |
| `frame-ancestors` | `'none'` | Предотвратява вграждане във всяка iframe (еквивалентно на `X-Frame-Options: DENY` ) |

### Сигурност на SVG изображения

SVG изображенията получават допълнителна пясъчна среда:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

SVG се сервират като прикачени файлове с напълно деактивирани скриптове и поставени в пясъчна среда, предотвратявайки XSS атаки, базирани на SVG.

### Допълнително втвърдяване `poweredByHeader` е деактивиран:

```typescript
poweredByHeader: false,
```

Това премахва заглавката `X-Powered-By: Next.js` , предотвратявайки технологичния пръстов отпечатък.

## Сигурност при удостоверяване

### Интегриране на NextAuth.js

Шаблонът използва NextAuth.js (Auth.js) за удостоверяване. Основните функции за сигурност включват:

- **JWT или сесии на база данни** с конфигурируема стратегия за сесии
- **CSRF защита** на всички изпращания на формуляри
- **Защитена конфигурация на бисквитки** с флагове `httpOnly` , `secure` и `sameSite` - **Потвърждение на входа** със схеми на Zod за всички действия на формуляра

### Валидирани действия

Действията на сървъра са защитени с помощта на валидирани обвивки на действия, дефинирани в `lib/auth/middleware.ts` :

```typescript
// Validate input with Zod before processing
export function validatedAction<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData);
  };
}

// Validate input AND require authentication
export function validatedActionWithUser<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("User is not authenticated");
    }
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData, session.user);
  };
}
```

**Винаги използвайте `validatedActionWithUser` ** за удостоверени операции. Това гарантира както валидирането на входа, така и проверката на сесията, преди да се изпълни каквато и да е бизнес логика.

## Прилагане на RBAC

Шаблонът включва пълна ролева система за контрол на достъпа в `lib/middleware/permission-check.ts` .

### Формат на разрешение

Разрешенията следват модел `resource:action` :

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### Функции за проверка на разрешения

| Функция | Цел | Пример |
|---|---|---|
| `hasPermission` | Проверете единично разрешение | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | Проверете дали потребителят има поне един | `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| `hasAllPermissions` | Проверете дали потребителят има всички изброени | `hasAllPermissions(user, ['users:read', 'users:update'])` |
| `hasResourcePermission` | Проверка по низове за ресурс + действие | `hasResourcePermission(user, 'items', 'delete')` |
| `canManageResource` | Поставете отметка за създаване/актуализиране/изтриване | `canManageResource(user, 'categories')` |
| `canReviewItems` | Проверете разрешенията за преглед на елементи | `canReviewItems(user)` |
| `canManageUsers` | Проверете разрешенията за управление на потребителите | `canManageUsers(user)` |
| `canManageRoles` | Проверете разрешенията за управление на роли | `canManageRoles(user)` |
| `canViewAnalytics` | Проверете достъпа до анализ | `canViewAnalytics(user)` |
| `isSuperAdmin` | Проверете за роля на суперадминистратор или всички разрешения | `isSuperAdmin(user)` |

### Използване на разрешения в API маршрути

```typescript
import { hasPermission, UserPermissions } from '@/lib/middleware/permission-check';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPerms: UserPermissions = {
    userId: session.user.id,
    roles: session.user.roles,
    permissions: session.user.permissions,
  };

  if (!hasPermission(userPerms, 'items:create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with authorized logic
}
```

### Откриване на супер администратор

Функцията `isSuperAdmin` използва двоен подход за максимална сигурност:

1. **Проверка на роли**: Проверява дали потребителят има роля `super-admin` 2. **Резервно разрешение**: Проверява, че потребителят притежава всяко определено системно разрешение

Това гарантира, че нито един частичен набор от разрешения не може случайно да предостави достъп на суперадминистратор.

## Ограничаване на скоростта

### API Route Protection

Внедрете ограничаване на скоростта за публични API маршрути, за да предотвратите злоупотреба:

```typescript
// Example using a simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

За производствени внедрявания обмислете използването на:
- **Vercel Edge Middleware** с ограничение на скоростта `@vercel/edge` - **Upstash Redis** за разпределено ограничаване на скоростта в инстанции без сървър
- **Cloudflare Rate Limiting** на CDN слоя

### Cron Endpoint Protection

Крайните точки на Cron API трябва да проверяват споделена тайна, за да предотвратят неоторизирано извикване:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

`CRON_SECRET` се задава чрез променливи на средата и се конфигурира по време на внедряването (вижте работния поток за внедряване на Vercel на конвейера CI/CD).

## Проверка на входа

### Проверка на Zod схема

Всички въведени форми и полезни натоварвания на API трябва да бъдат валидирани със схеми на Zod:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### Предотвратяване на SQL инжектиране

Шаблонът използва Drizzle ORM за всички заявки към базата данни, което автоматично параметризира всички стойности. Никога не създавайте необработени SQL низове с въвеждане от потребителя.

### XSS профилактика

- Сървърните компоненти се изобразяват на сървъра и не излагат необработен HTML на клиента.
- Цялото съдържание, генерирано от потребителите, трябва да бъде екранирано с помощта на вграденото екраниране на React (JSX автоматично екранира низовете).
- Заглавката на CSP блокира вградени скриптове от ненадеждни източници.

## Сигурност на променливата на средата

### Задължителни тайни

| Променлива | Цел | Поколение |
|---|---|---|
| `AUTH_SECRET` | Подписва JWT токени и сесийни бисквитки | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Криптира стойностите на бисквитките | `openssl rand -base64 32` |
| `CRON_SECRET` | Удостоверява заявките за крайни точки на cron | `openssl rand -base64 32` |
| `DATABASE_URL` | Низ за връзка с база данни | Предоставено от хоста на базата данни |

### Най-добри практики

1. **Никога не предавайте тайни** на контрола на версиите. Използвайте `.env.local` за разработка и тайни на ниво платформа за производство.
2. **Сменяйте тайните редовно**, особено `AUTH_SECRET` и `COOKIE_SECRET` .
3. **Използвайте отделни тайни за среда** -- не споделяйте производствени тайни с етапи или разработка.
4. **Ограничете достъпа** до променливите на производствената среда, като използвате RBAC на вашата платформа (роли на екипа на Vercel, правила за защита на средата GitHub).

## Контролен списък за сигурност за производство

| Категория | Артикул | Статус |
|---|---|---|
| **Заглавки** | Всички заглавки за сигурност, конфигурирани в `next.config.ts` | Вграден |
| **Заглавки** | `poweredByHeader` забранено | Вграден |
| **Заглавки** | HSTS предварително зареждане е активирано с 2-годишна максимална възраст | Вграден |
| **Удостоверяване** | `AUTH_SECRET` е силна произволна стойност | Ръководство |
| **Удостоверяване** | Сесийните бисквитки използват `httpOnly` , `secure` , `sameSite` | Вграден |
| **Удостоверяване** | Всички действия на сървъра използват `validatedActionWithUser` | Преглед |
| **RBAC** | Разрешенията се проверяват за всеки защитен маршрут | Преглед |
| **RBAC** | Достъпът на супер администратор изисква изрично присвояване на роли | Вграден |
| **Вход** | Zod валидиране на всички входове на формуляри и полезни натоварвания на API | Преглед |
| **Вход** | Без необработени SQL заявки (само за Drizzle ORM) | Преглед |
| **Cron** | Крайните точки на Cron проверяват `CRON_SECRET` | Преглед |
| **Тайни** | Всички тайни сменени и специфични за средата | Ръководство |
| **CSP** | Правилата за сигурност на съдържанието са прегледани за производствени домейни | Ръководство |
| **Deps** | CodeQL анализът се изпълнява всяка седмица в кодовата база | Вграден |
| **Deps** | Проверени зависимости ( `pnpm audit` ) | Ръководство |

## Докладване на проблеми със сигурността

Ако откриете уязвимост в сигурността, докладвайте за това лично:

- **Имейл**: security@ever.co
- **Не** отваряйте публичен проблем с GitHub за уязвимости в сигурността.
- Включете стъпки за възпроизвеждане и оценка на въздействието, когато е възможно.
