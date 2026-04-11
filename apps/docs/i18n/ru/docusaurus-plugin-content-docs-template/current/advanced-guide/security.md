---
id: security
title: Усиление безопасности
sidebar_label: Безопасность
sidebar_position: 6
---

# Усиление безопасности

Шаблон Ever Works по умолчанию включает несколько уровней безопасности. В этом руководстве описаны встроенные средства защиты и представлены рекомендации по дальнейшему усилению безопасности вашего производственного развертывания.

## Заголовки безопасности

Шаблон настраивает заголовки безопасности глобально в `next.config.ts` для всех маршрутов:

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

### Разбивка заголовка

| Заголовок | Значение | Цель |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Предотвращает атаки с перехватом MIME-типа |
| `X-Frame-Options` | `DENY` | Блокирует встраивание сайта в iframe (защита от кликджекинга) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Ограничивает отправку информации о реферере во внешние источники |
| `X-DNS-Prefetch-Control` | `on` | Включает предварительную выборку DNS для повышения производительности |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Обеспечивает соблюдение протокола HTTPS примерно на 2 года, охватывает все поддомены, подходящие для списка предварительной загрузки HSTS |
| `Content-Security-Policy` | См. ниже | Ограничивает источники загрузки ресурсов |

### Политика безопасности контента

CSP настроен как:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| Директива | Значение | Заметки |
|---|---|---|
| `default-src` | `'self'` | По умолчанию разрешать ресурсы только из одного и того же источника |
| `script-src` | `'self' 'unsafe-inline'` + LemonSqueezy | Требуется для встроенных скриптов и виджета оплаты |
| `style-src` | `'self' 'unsafe-inline'` | Требуется для CSS-in-JS и Tailwind |
| `img-src` | `'self' data: https:` | Разрешает изображения из одного и того же источника, URI данных и любого источника HTTPS |
| `font-src` | `'self'` | Только собственные шрифты |
| `connect-src` | `'self' https:` | Вызовы API к тому же источнику и любой конечной точке HTTPS |
| `frame-ancestors` | `'none'` | Запрещает встраивание в любой iframe (эквивалент `X-Frame-Options: DENY` ) |

### Безопасность изображений SVG

Изображения SVG получают дополнительную песочницу:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

SVG-файлы предоставляются в виде вложений с полностью отключенными скриптами и изолированной программной средой, что предотвращает XSS-атаки на основе SVG.

### Дополнительная закалка `poweredByHeader` отключен:

```typescript
poweredByHeader: false,
```

При этом заголовок `X-Powered-By: Next.js` будет удален, что предотвратит снятие отпечатков пальцев технологии.

## Безопасность аутентификации

### Интеграция NextAuth.js

Шаблон использует NextAuth.js (Auth.js) для аутентификации. Ключевые функции безопасности включают в себя:

- **Сеансы JWT или базы данных** с настраиваемой стратегией сеанса.
- **Защита CSRF** для всех отправленных форм.
- **Безопасная конфигурация файлов cookie** с флагами `httpOnly` , `secure` и `sameSite` .
- **Проверка ввода** с помощью схем Zod для всех действий формы.

### Проверенные действия

Действия сервера защищены с помощью проверенных оболочек действий, определенных в `lib/auth/middleware.ts` :

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

**Всегда используйте `validatedActionWithUser` ** для аутентифицированных операций. Это гарантирует, что проверка входных данных и проверка сеанса выполняются до выполнения какой-либо бизнес-логики.

## Применение RBAC

Шаблон включает в себя полную систему контроля доступа на основе ролей в `lib/middleware/permission-check.ts` .

### Формат разрешения

Разрешения следуют шаблону `resource:action` :

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### Функции проверки разрешений

| Функция | Цель | Пример |
|---|---|---|
| `hasPermission` | Проверьте одно разрешение | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | Проверьте, есть ли у пользователя хотя бы один | `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| `hasAllPermissions` | Проверьте, есть ли у пользователя все перечисленные | `hasAllPermissions(user, ['users:read', 'users:update'])` |
| `hasResourcePermission` | Проверка по ресурсу + строкам действий | `hasResourcePermission(user, 'items', 'delete')` |
| `canManageResource` | Проверьте создание/обновление/удаление | `canManageResource(user, 'categories')` |
| `canReviewItems` | Проверьте разрешения на просмотр элемента | `canReviewItems(user)` |
| `canManageUsers` | Проверьте разрешения на управление пользователями | `canManageUsers(user)` |
| `canManageRoles` | Проверьте разрешения на управление ролями | `canManageRoles(user)` |
| `canViewAnalytics` | Проверить доступ к аналитике | `canViewAnalytics(user)` |
| `isSuperAdmin` | Проверьте наличие роли суперадминистратора или всех разрешений | `isSuperAdmin(user)` |

### Использование разрешений в маршрутах API

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

### Обнаружение суперадминистратора

Функция `isSuperAdmin` использует двойной подход для максимальной безопасности:

1. **Проверка роли**: проверяет, имеет ли пользователь роль `super-admin` .
2. **Резервный доступ**: проверяет, обладает ли пользователь всеми определенными системными разрешениями.

Это гарантирует, что ни один частичный набор разрешений не сможет случайно предоставить доступ суперадминистратора.

## Ограничение скорости

### Защита маршрутов API

Внедрите ограничение скорости для общедоступных маршрутов API, чтобы предотвратить злоупотребления:

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

Для производственных развертываний рассмотрите возможность использования:
- **Промежуточное ПО Vercel Edge** с ограничением скорости `@vercel/edge` - **Upstash Redis** для ограничения распределенной скорости между бессерверными экземплярами.
- **Ограничение скорости Cloudflare** на уровне CDN.

### Защита конечных точек Cron

Конечные точки API Cron должны проверять общий секрет, чтобы предотвратить несанкционированный вызов:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

Значение `CRON_SECRET` задается с помощью переменных среды и настраивается во время развертывания (см. рабочий процесс развертывания Vercel конвейера CI/CD).

## Проверка ввода

### Проверка схемы Zod

Все входные данные формы и полезные данные API должны быть проверены с помощью схем Zod:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### Предотвращение SQL-инъекций

Шаблон использует Drizzle ORM для всех запросов к базе данных, который автоматически параметризует все значения. Никогда не создавайте необработанные строки SQL с пользовательским вводом.

### Предотвращение XSS

- Серверные компоненты визуализируются на сервере и не предоставляют клиенту необработанный HTML.
— Весь пользовательский контент должен быть экранирован с помощью встроенного экранирования React (JSX автоматически экранирует строки).
— Заголовок CSP блокирует встроенные сценарии из ненадежных источников.

## Безопасность переменной среды

### Обязательные секреты

| Переменная | Цель | Поколение |
|---|---|---|
| `AUTH_SECRET` | Подписывает токены JWT и файлы cookie сеанса | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Шифрует значения файлов cookie | `openssl rand -base64 32` |
| `CRON_SECRET` | Аутентифицирует запросы конечной точки cron | `openssl rand -base64 32` |
| `DATABASE_URL` | Строка подключения к базе данных | Предоставлено хостом базы данных |

### Лучшие практики

1. **Никогда не передавайте секреты** в систему контроля версий. Используйте `.env.local` для разработки и секретов уровня платформы для производства.
2. **Регулярно меняйте секреты**, особенно `AUTH_SECRET` и `COOKIE_SECRET` .
3. **Используйте отдельные секреты для каждой среды** – не передавайте секреты производства при промежуточном этапе или разработке.
4. **Ограничьте доступ** к переменным производственной среды с помощью RBAC вашей платформы (роли команды Vercel, правила защиты среды GitHub).

## Контрольный список безопасности для производства

| Категория | Товар | Статус |
|---|---|---|
| **Заголовки** | Все заголовки безопасности, настроенные в `next.config.ts` | Встроенный |
| **Заголовки** | `poweredByHeader` отключено | Встроенный |
| **Заголовки** | Предварительная загрузка HSTS включена с максимальным возрастом в 2 года | Встроенный |
| **Аутентификация** | `AUTH_SECRET` — сильная случайная величина | Руководство |
| **Аутентификация** | Сеансовые файлы cookie используют `httpOnly` , `secure` , `sameSite` | Встроенный |
| **Аутентификация** | Все действия сервера используют `validatedActionWithUser` | Обзор |
| **РБАК** | Разрешения проверяются на каждом защищенном маршруте | Обзор |
| **РБАК** | Доступ суперадминистратора требует явного назначения ролей | Встроенный |
| **Ввод** | Проверка Zod для всех входных данных формы и полезных данных API | Обзор |
| **Ввод** | Никаких необработанных SQL-запросов (только для Drizzle ORM) | Обзор |
| **Крон** | Конечные точки Cron проверяют `CRON_SECRET` | Обзор |
| **Секреты** | Все секреты повернуты и зависят от окружающей среды | Руководство |
| **CSP** | Политика безопасности контента рассмотрена для рабочих доменов | Руководство |
| **Депс** | Анализ CodeQL выполняется еженедельно в базе кода | Встроенный |
| **Депс** | Проверенные зависимости ( `pnpm audit` ) | Руководство |

## Сообщение о проблемах безопасности

Если вы обнаружите уязвимость безопасности, сообщите об этом лично:

- **Электронная почта**: security@ever.co.
- **Не** открывайте общедоступную публикацию на GitHub об уязвимостях безопасности.
- Включите этапы воспроизводства и оценку воздействия, когда это возможно.
