---
id: rate-limiting-architecture
title: ארכיטקטורה מגבילת שיעור
sidebar_label: הגבלת תעריפים
sidebar_position: 5
---

# ארכיטקטורה מגבילת שיעור

מדריך זה מכסה את מערכת הגבלת התעריף, כולל חנות בזיכרון, תצורה לכל מסלול, התנהגות חלון הזזה, כותרות מגבלת תעריף וכללי עקיפה.

## סקירה כללית של אדריכלות

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

## פונקציית הגבלת קצב ליבה

הפונקציה `ratelimit` ב- `lib/utils/rate-limit.ts` מיישמת מגביל קצב חלון קבוע:

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

### ממשק תוצאות מגבלת שיעור

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## חנות בזיכרון

מגביל הקצב משתמש ב- `Map<string, RateLimitEntry>` עבור חיפושי O(1):

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### ניקוי אוטומטי

ערכים שפג תוקפם מנקים כל 5 דקות כדי למנוע דליפות זיכרון:

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

## תצורה לכל מסלול

### מגבלות מומלצות

| דפוס מסלול | הגבלה | חלון | נימוק |
|-------------|-------|--------|-----------|
| `POST /api/auth/signin` | 5 | 15 דקות | למנוע כוח גס |
| `POST /api/auth/register` | 3 | 1 שעה | מניעת דואר זבל בחשבון |
| `POST /api/comments` | 10 | 1 דקה | מניעת ספאם של הערות |
| `GET /api/items` | 100 | 1 דקה | אפשר גלישה |
| `POST /api/submit` | 5 | 10 דקות | מניעת ספאם של הגשת |
| `POST /api/contact` | 3 | 1 שעה | מניעת דואר זבל בדואר אלקטרוני |
| `POST /api/webhook/*` | 1000 | 1 דקה | תפוקה גבוהה לספקים |

### יישום מגבלות לכל מסלול

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

## כותרות מגבלת שיעור

כלול כותרות של מגבלת תעריף סטנדרטית בכל תגובות ה-API:

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

### הפניה לכותרת

| כותרת | תיאור | דוגמה |
|--------|-------------|--------|
| `X-RateLimit-Limit` | מקסימום בקשות לחלון | `100` |
| `X-RateLimit-Remaining` | בקשות שנותרו בחלון | `87` |
| `X-RateLimit-Reset` | חותמת זמן של יוניקס כאשר החלון מתאפס | `1709654400000` |
| `Retry-After` | שניות עד לבקשה המותרת הבאה | `45` |

## בדיקת סטטוס מגבלת שיעור

שאל את המצב הנוכחי מבלי להגדיל את המונה:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## איפוס מגבלות קצב

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## עוקף חוקים

### מקורות מהימנים

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

## אסטרטגיות מפתח מורכבות

### מבוסס IP (אנונימי)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### מבוסס משתמש (מאומת)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### משולב (IP + מסלול)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## שיקולי ביצועים

1. **שימוש בזיכרון**: כל ערך משתמש ב-~100 בתים. ב-100,000 מפתחות פעילים, כלומר ~10 MB.
2. **תדירות הניקוי**: מרווח הניקוי של 5 דקות הוא איזון טוב. הפחת עבור יישומים בעלי תנועה גבוהה.
3. **ביצועי מפה**: JavaScript `Map` מספק O(1) get/set. אין ביצועים נוגעים לעד מיליוני ערכים.
4. **פריסה מבוזרת**: חנות הזיכרון אינה חולקת מצב בין מופעים. עבור פריסות מרובות מופעים, השתמש בהגבלת קצב מגובת Redis.

## שיקולי הפקה

### פריסות ריבוי מופעים

מגביל קצב הזיכרון אינו חולק מצב בין מופעי שרת. לייצור:

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

### חלון הזזה לעומת חלון קבוע

היישום הנוכחי משתמש ב-**חלונות קבועים**. משמעות הדבר היא שפרץ של בקשות בגבול החלון יכול לאפשר עד `2 * limit` בקשות בפרק זמן קצר. להגבלה מחמירה יותר, יישם חלון הזזה:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## פתרון בעיות

### מגבלת התעריף לא נאכפת

1. ודא שהמפתח הוא ייחודי לכל לקוח (בדוק חילוץ IP).
2. ודא ש- `ratelimit()` נקרא לפני הלוגיקה של מטפל הבקשות.
3. בדקו שהתגובה מוחזרת מיד ב- `!result.success` .

### שיעור כל הבקשות מוגבל באופן מיידי

1. בדוק שהפרמטר `limit` אינו 0 או שלילי.
2. ודא שהפרמטר `windowMs` הוא במילי-שניות, לא בשניות.
3. סמן את המפתח -- אם כל הבקשות חולקות את אותו מפתח, הן חולקות את אותה הגבלה.

### זיכרון גדל ללא גבולות

1. מרווח הניקוי של 5 דקות אמור להתמודד עם זה. ודא כי טיימר המרווחים פועל.
2. התקשר ל- `resetRateLimit(key)` כדי לנקות ידנית מקשים ספציפיים.
3. מעקב אחר גודל החנות בפיתוח.

## תיעוד קשור

- [דפוסי שחזור שגיאות](./error-recovery-patterns.md)
- [Webhook Architecture](./webhook-architecture.md)
- [Session Management Deep Dive](./session-management-deep-dive.md)
