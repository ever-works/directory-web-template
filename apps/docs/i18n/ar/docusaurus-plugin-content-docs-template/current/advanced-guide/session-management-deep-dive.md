---
id: session-management-deep-dive
title: إدارة الجلسة الغوص العميق
sidebar_label: إدارة الجلسة
sidebar_position: 4
---

#الغوص العميق في إدارة الجلسة

يغطي هذا الدليل بنية الجلسة بما في ذلك تكامل NextAuth.js، والتخزين المؤقت للجلسة في الذاكرة، واستخراج الرمز المميز، وإبطال ذاكرة التخزين المؤقت، والأدوات المساعدة للجلسة من جانب الخادم.

## نظرة عامة على الهندسة المعمارية

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

## طبقة ذاكرة التخزين المؤقت للجلسة

### فئة ذاكرة التخزين المؤقت للجلسة

0 في 1 هو ذاكرة تخزين مؤقت مفردة في الذاكرة:

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

### إنشاء مفتاح ذاكرة التخزين المؤقت

يتم اشتقاق المفاتيح عن طريق تجزئة SHA-256 للرمز المميز للجلسة لمنع ظهور البيانات الحساسة في عمليات تفريغ الذاكرة:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### بناء معرف ذاكرة التخزين المؤقت

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## استرجاع الجلسة المخزنة مؤقتا

### مكونات الخادم ومسارات واجهة برمجة التطبيقات

الدالة 0 في 1 هي نقطة الدخول الأساسية:

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

### استخدام طريق API

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

### استخدام مكونات الخادم

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## استخراج الرمز المميز

تقوم الوظيفة `extractSessionToken` بالتحقق من مصادر متعددة:

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

## إبطال ذاكرة التخزين المؤقت

### إبطال جلسة واحدة

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### مسح ذاكرة التخزين المؤقت بالكامل

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## إحصائيات ومراقبة ذاكرة التخزين المؤقت

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

### تسجيل التطوير

في وضع التطوير، تقوم ذاكرة التخزين المؤقت بتسجيل النتائج والإخفاقات وحالات إبطال العمل تلقائيًا:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## توافق وقت تشغيل الحافة

تستخدم وحدة المصادقة عمليات الاستيراد الديناميكية لتجنب تجميع برامج تشغيل قاعدة البيانات في Edge Runtime:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## إدارة الذاكرة

### استراتيجية التنظيف

تستخدم ذاكرة التخزين المؤقت للجلسة آليتي تنظيف:

1. **التنظيف الاحتمالي (10%)**: في كل مكالمة 0، هناك فرصة بنسبة 10% لإجراء التنظيف الكامل.
2. ** إخلاء LRU **: عندما تتجاوز ذاكرة التخزين المؤقت 1000 إدخال، يتم إخلاء الإدخالات الأقدم (بمقدار `createdAt` ).

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

## اعتبارات الأداء

1. **هدف معدل الوصول إلى ذاكرة التخزين المؤقت**: اهدف إلى الوصول إلى معدل إصابة بنسبة 80%+. تشير المعدلات المنخفضة إلى أن TTL قصير جدًا أو أنه لا يتم استخراج الرموز المميزة بشكل صحيح.
2. **بصمة الذاكرة**: يبلغ حجم كل جلسة مخبأة حوالي 1-2 كيلو بايت. عند السعة القصوى (1000)، تستخدم ذاكرة التخزين المؤقت ما يقرب من 1-2 ميجابايت.
3. ** حمل SHA-256 **: يضيف إنشاء المفاتيح ~0.1 مللي ثانية لكل عملية بحث. وهذا لا يكاد يذكر مقارنة بقاعدة البيانات المحفوظة ذهابًا وإيابًا.
4. **عقوبة البدء البارد**: بعد النشر، تفقد جميع الجلسات ذاكرة التخزين المؤقت عند الطلب الأول.

## استكشاف الأخطاء وإصلاحها

### لم يتم تخزين الجلسة مؤقتًا بعد تسجيل الدخول

1. تأكد من إرسال ملف تعريف الارتباط للرمز المميز للجلسة مع الطلبات.
2. تأكد من أن `extractSessionToken` يمكنه تحليل تنسيق ملف تعريف الارتباط.
3. تأكد من أن الوظيفة 1 تستقبل المعلمة 2.

### ذاكرة التخزين المؤقت تنمو بلا حدود

1. تحقق من تشغيل عملية التنظيف الاحتمالية (تحقق من وجود رسائل سجل التنظيف).
2. فرض التنظيف عن طريق الاتصال بالرقم 3.
3. مراقبة حجم ذاكرة التخزين المؤقت باستخدام 4.

### جلسة قديمة بعد تغيير الدور

1. اتصل بالرقم 5 بعد تغيير الدور.
2. يعني TTL لمدة 10 دقائق أن البيانات القديمة تستمر لمدة تصل إلى 10 دقائق دون إبطال صريح.

## الوثائق ذات الصلة

- [التعمق في بنية التخزين المؤقت](./caching-deep-dive.md)
- [أنماط استرداد الأخطاء](./error-recovery-patterns.md)
- [بنية تحديد المعدل](./rate-limiting-architecture.md)
