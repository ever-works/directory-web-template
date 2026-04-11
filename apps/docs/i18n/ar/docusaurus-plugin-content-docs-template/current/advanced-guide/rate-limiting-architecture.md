---
id: rate-limiting-architecture
title: معدل الحد من الهندسة المعمارية
sidebar_label: الحد من المعدل
sidebar_position: 5
---

# معدل الحد من الهندسة المعمارية

يغطي هذا الدليل نظام تحديد المعدل، بما في ذلك المخزن في الذاكرة، والتكوين لكل مسار، وسلوك النافذة المنزلقة، ورؤوس حدود المعدل، وقواعد التجاوز.

## نظرة عامة على الهندسة المعمارية

```
Rate Limiting Flow
===================

  Incoming Request
       |
       v
  +------------------------+
  | Extract Identifier     |  <-- IP address, user ID, API key
  +------------------------+
       |
       v
  +------------------------+
  | Build Rate Limit Key   |  <-- "ip:192.168.1.1:/api/items"
  +------------------------+
       |
       v
  +------------------------+
  | Check In-Memory Store  |
  |   Entry exists?        |
  |   Window expired?      |
  |   Count < limit?       |
  +------------------------+
       |
  +----+----+
  ALLOW     DENY
  |         |
  v         v
  Increment   Return 429
  counter     + Retry-After
  Continue    + Rate limit headers
```

## وظيفة تحديد المعدل الأساسي

تطبق الوظيفة 0 في 1 محدد معدل النافذة الثابتة:

```typescript
// lib/utils/rate-limit.ts
export async function ratelimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTime = now + windowMs;

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Increment counter
  entry.count++;
  return { success: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}
```

### واجهة نتيجة الحد الأقصى للسعر

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## مخزن في الذاكرة

يستخدم محدد المعدل `Map<string, RateLimitEntry>` لعمليات البحث O(1):

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### التنظيف التلقائي

يتم تنظيف الإدخالات منتهية الصلاحية كل 5 دقائق لمنع تسرب الذاكرة:

```typescript
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
```

## التكوين لكل مسار

### الحدود الموصى بها

| نمط الطريق | الحد | نافذة | الأساس المنطقي |
|--------------|-------|--------|-----------|
| `POST /api/auth/signin` | 5 | 15 دقيقة | منع القوة الغاشمة |
| `POST /api/auth/register` | 3 | 1 ساعة | منع البريد العشوائي في الحساب |
| `POST /api/comments` | 10 | 1 دقيقة | منع التعليقات غير المرغوب فيها |
| `GET /api/items` | 100 | 1 دقيقة | السماح بالتصفح |
| 4ـ | 5 | 10 دقائق | منع تقديم البريد المزعج |
| 5 ــ | 3 | 1 ساعة | منع البريد الإلكتروني العشوائي |
| 6ـ | 1000 | 1 دقيقة | إنتاجية عالية لمقدمي الخدمات |

### تنفيذ الحدود لكل مسار

```typescript
// In an API route handler
import { ratelimit } from '@/lib/utils/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = `signin:${ip}`;

  const result = await ratelimit(key, 5, 15 * 60 * 1000);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    );
  }

  // Process the request...
}
```

## رؤوس حدود السعر

قم بتضمين رؤوس حدود المعدل القياسي في جميع استجابات واجهة برمجة التطبيقات:

```typescript
function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetTime));

  if (!result.success && result.retryAfter) {
    response.headers.set('Retry-After', String(result.retryAfter));
  }

  return response;
}
```

### مرجع الرأس

| رأس | الوصف | مثال |
|--------|-----------|---------|
| `X-RateLimit-Limit` | الحد الأقصى للطلبات لكل نافذة | `100` |
| `X-RateLimit-Remaining` | الطلبات المتبقية في النافذة | `87` |
| 4ـ | الطابع الزمني لنظام Unix عند إعادة ضبط النافذة | 5 ــ |
| 6ـ | ثواني حتى الطلب التالي المسموح به | `45` |

## التحقق من حالة حد السعر

الاستعلام عن الحالة الحالية دون زيادة العداد:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## إعادة ضبط حدود المعدل

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## تجاوز القواعد

### مصادر موثوقة

```typescript
const BYPASS_IPS = new Set([
  '127.0.0.1',           // Localhost
  '::1',                 // IPv6 localhost
]);

const BYPASS_AGENTS = new Set([
  'stripe-webhook',
  'lemonsqueezy-webhook',
]);

function shouldBypass(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = request.headers.get('user-agent') || '';

  // Bypass for trusted IPs
  if (ip && BYPASS_IPS.has(ip)) return true;

  // Bypass for webhook providers
  if (BYPASS_AGENTS.has(userAgent)) return true;

  // Bypass for authenticated admin users
  // (check session in middleware)

  return false;
}
```

## الاستراتيجيات الرئيسية المركبة

### قائم على IP (مجهول)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### على أساس المستخدم (مصادق عليه)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### مدمج (IP + الطريق)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## اعتبارات الأداء

1. **استخدام الذاكرة**: يستخدم كل إدخال حوالي 100 بايت. عند وجود 100000 مفتاح نشط، أي حوالي 10 ميجابايت.
2. **تكرار التنظيف**: تعتبر فترة التنظيف البالغة 5 دقائق بمثابة توازن جيد. تقليل التطبيقات ذات حركة المرور العالية.
3. **أداء الخريطة**: توفر JavaScript `Map` O(1) get/set. لا يتعلق الأمر بالأداء حتى ملايين الإدخالات.
4. **النشر الموزع**: لا يشارك المخزن الموجود في الذاكرة الحالة عبر المثيلات. بالنسبة لعمليات النشر متعددة المثيلات، استخدم تحديد المعدل المدعوم من Redis.

## اعتبارات الإنتاج

### عمليات النشر متعددة المثيلات

لا يشارك محدد معدل الذاكرة في الحالة عبر مثيلات الخادم. للإنتاج:

```typescript
// Option 1: Redis-backed rate limiter (recommended for production)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// Option 2: Accept per-instance limiting
// Each instance has its own counter. Effective limit = limit * instance_count.
```

### النافذة المنزلقة مقابل النافذة الثابتة

يستخدم التنفيذ الحالي **النوافذ الثابتة**. وهذا يعني أن موجة من الطلبات عند حدود النافذة قد تسمح بما يصل إلى 0 طلبًا في فترة قصيرة. لتقييد أكثر صرامة، قم بتنفيذ نافذة منزلقة:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## استكشاف الأخطاء وإصلاحها

### لم يتم فرض حد السعر

1. تأكد من أن المفتاح فريد لكل عميل (تحقق من استخراج IP).
2. تأكد من استدعاء `ratelimit()` قبل منطق معالج الطلب.
3. تأكد من إرجاع الرد فورًا في الرقم 1.

### معدل جميع الطلبات محدود على الفور

1. تأكد من أن المعلمة "2" ليست 0 أو سالبة.
2. تحقق من أن المعلمة `windowMs` بالمللي ثانية وليس بالثواني.
3. تحقق من المفتاح - إذا كانت جميع الطلبات تشترك في نفس المفتاح، فإنها تشترك في نفس الحد.

### الذاكرة تنمو بلا حدود

1. يجب أن تتعامل فترة التنظيف البالغة 5 دقائق مع هذا الأمر. تحقق من تشغيل مؤقت الفاصل الزمني.
2. اتصل بالرقم 4 لمسح مفاتيح محددة يدويًا.
3. مراقبة حجم المتجر قيد التطوير.

## الوثائق ذات الصلة

- [أنماط استرداد الأخطاء](./error-recovery-patterns.md)
- [هندسة الويب هوك](./webhook-architecture.md)
- [التعمق في إدارة الجلسة](./session-management-deep-dive.md)
