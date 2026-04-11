---
id: session-management-deep-dive
title: ניהול מפגשים צלילה עמוקה
sidebar_label: ניהול מפגשים
sidebar_position: 4
---

# ניהול מפגשים עמוק צלילה

מדריך זה מכסה את ארכיטקטורת ההפעלה, כולל שילוב NextAuth.js, שמירה במטמון של הפעלה בזיכרון, חילוץ אסימון, אי תוקף מטמון וכלי עזר להפעלה בצד השרת.

## סקירה כללית של אדריכלות

```
Session Management Flow
========================

  Browser (Client)                    Server
  +------------------+                +------------------+
  | useSession()     | -- cookie ---> | getCachedSession |
  | (next-auth/react)|                |      |           |
  +------------------+                |      v           |
                                      | SessionCache     |
                                      |   HIT? -------> Return cached
                                      |   MISS -------> NextAuth auth()
                                      |                  |
                                      |                  v
                                      |              Cache result
                                      |              Return session
                                      +------------------+

  Token Extraction Sources:
  1. Cookie: next-auth.session-token
  2. Cookie: __Secure-next-auth.session-token
  3. Header: Authorization: Bearer <token>
  4. Header: X-Session-Token: <token>
```

## שכבת מטמון הפעלה

### שיעור SessionCache

ה- `SessionCache` ב- `lib/auth/session-cache.ts` הוא מטמון יחיד בזיכרון:

```typescript
// lib/auth/session-cache.ts
class SessionCache {
  private cache = new Map<string, CachedSession>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_SIZE = 1000;
  private stats = { hits: 0, misses: 0 };

  async get(identifier: string): Promise<Session | null> {
    const key = await this.generateKey(identifier);
    const cached = this.cache.get(key);

    if (!cached || this.isExpired(cached)) {
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.session;
  }

  async set(identifier: string, session: Session): Promise<void> {
    const key = await this.generateKey(identifier);
    this.cache.set(key, {
      session,
      expiresAt: Date.now() + this.TTL_MS,
      createdAt: Date.now(),
    });

    // 10% probabilistic cleanup
    if (Math.random() < 0.1) {
      this.cleanup();
    }
  }
}

export const sessionCache = new SessionCache();
```

### יצירת מפתח מטמון

המפתחות נגזרים על ידי SHA-256 hashing של אסימון ההפעלה כדי למנוע ממידע רגיש להופיע ב-dumps של זיכרון:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### בניית מזהה מטמון

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## אחזור הפעלה במטמון

### רכיבי שרת ומסלולי API

הפונקציה `getCachedSession` ב- `lib/auth/cached-session.ts` היא נקודת הכניסה הראשית:

```typescript
// lib/auth/cached-session.ts
export async function getCachedSession(request?: Request): Promise<Session | null> {
  try {
    const sessionToken = extractSessionToken(request);

    // Cache lookup
    if (sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      const cachedSession = await sessionCache.get(identifier);
      if (cachedSession) return cachedSession;
    }

    // Cache miss: fetch from NextAuth
    const auth = await getAuth();
    const session = await auth();

    // Store in cache
    if (session && sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      await sessionCache.set(identifier, session);
    }

    return session;
  } catch (error) {
    // Fallback to direct NextAuth call
    const auth = await getAuth();
    return await auth();
  }
}
```

### שימוש במסלול API

```typescript
// In API route handlers
import { getCachedApiSession } from '@/lib/auth/cached-session';

export async function GET(request: NextRequest) {
  const session = await getCachedApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... handle authenticated request
}
```

### שימוש ברכיבי שרת

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## חילוץ אסימון

הפונקציה `extractSessionToken` בודקת מספר מקורות:

```typescript
function extractSessionToken(request?: Request): string | null {
  if (!request) return null;

  // 1. NextAuth session cookies
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const sessionToken =
      cookies['next-auth.session-token'] ||
      cookies['__Secure-next-auth.session-token'] ||
      cookies['next-auth.csrf-token'];
    if (sessionToken) return sessionToken;
  }

  // 2. Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 3. Custom session header
  const sessionHeader = request.headers.get('x-session-token');
  if (sessionHeader) return sessionHeader;

  return null;
}
```

## אי תוקף מטמון

### ביטול הפעלה בודדת

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### נקה מטמון מלא

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## סטטיסטיקת מטמון וניטור

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

const stats = getSessionCacheStats();
// {
//   hits: 450,
//   misses: 50,
//   size: 123,
//   hitRate: 90.00
// }
```

### רישום פיתוח

במצב פיתוח, המטמון רושם כניסות, החמצות ופסילות באופן אוטומטי:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## תאימות לזמן ריצה של Edge

מודול האימות משתמש בייבוא דינמי כדי להימנע מאגדת מנהלי התקנים של מסד נתונים ב-Edge Runtime:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## ניהול זיכרון

### אסטרטגיית ניקוי

מטמון ההפעלה משתמש בשני מנגנוני ניקוי:

1. **ניקוי הסתברותי (10%)**: בכל שיחת `set()` יש סיכוי של 10% להפעיל ניקוי מלא.
2. **פינוי LRU**: כאשר המטמון עולה על 1,000 ערכים, הערכים הישנים ביותר (לפי `createdAt` ) מפונים.

```typescript
private cleanup(): void {
  const now = Date.now();

  // Remove expired entries
  for (const [key, cached] of this.cache.entries()) {
    if (now > cached.expiresAt) {
      this.cache.delete(key);
    }
  }

  // Enforce size limit (LRU eviction)
  if (this.cache.size > this.MAX_SIZE) {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toDelete = entries.slice(0, this.cache.size - this.MAX_SIZE);
    toDelete.forEach(([key]) => this.cache.delete(key));
  }
}
```

## שיקולי ביצועים

1. **יעד שיעור פגיעה במטמון**: כוון לשיעור פגיעה של 80%+. שיעורים נמוכים יותר מצביעים על כך שה-TTL קצר מדי או שאסימונים אינם נשלפים כראוי.
2. **טביעת זיכרון**: כל הפעלה במטמון היא בערך 1-2 KB. בקיבולת מקסימלית (1,000), המטמון משתמש בערך 1-2 MB.
3. **SHA-256 תקורה**: יצירת מפתחות מוסיפה ~0.1ms לכל בדיקה. זה זניח בהשוואה למאגר הנתונים הלוך ושוב שנשמר.
4. **עונש על התחלה קרה**: לאחר הפריסה, כל הפעלות מחמיצות את המטמון על פי בקשה ראשונה.

## פתרון בעיות

### ההפעלה לא נשמרת במטמון לאחר הכניסה

1. ודא שקובץ ה-cookie של אסימון ההפעלה נשלח עם בקשות.
2. בדוק ש- `extractSessionToken` יכול לנתח את פורמט העוגיות.
3. ודא שהפונקציה `getCachedSession` מקבלת את הפרמטר `request` .

### המטמון גדל ללא גבולות

1. ודא שניקוי הסתברותי פועל (בדוק אם יש הודעות יומן ניקוי).
2. כפה ניקוי על ידי קריאה ל- `sessionCache.clear()` .
3. עקוב אחר גודל המטמון באמצעות `getSessionCacheStats().size` .

### סשן מעופש לאחר שינוי תפקיד

1. התקשר ל- `invalidateSessionCache(sessionToken, userId)` לאחר החלפת תפקידים.
2. ה-TTL של 10 דקות פירושו שהנתונים המעופשים נשארים עד 10 דקות ללא ביטול מפורש.

## תיעוד קשור

- [Caching Architecture Deep Dive](./caching-deep-dive.md)
- [דפוסי שחזור שגיאות](./error-recovery-patterns.md)
- [Rate Limiting Architecture](./rate-limiting-architecture.md)
