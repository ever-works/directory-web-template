---
id: utils-reference
title: "مرجع المرافق"
sidebar_label: "مرجع الأدوات"
sidebar_position: 24
---

# مرجع المرافق

يوفر القالب وظائف الأداة المساعدة عبر دليلين: `utils/` للمساعدين للأغراض العامة و`lib/utils/` للأدوات المساعدة المدمجة في إطار العمل. يوثق هذا المرجع كل وحدة مساعدة وصادراتها وأنماط استخدامها.

## هيكل الدليل

```
utils/                              # General-purpose utilities
├── date.ts                         # Date formatting
├── pagination.ts                   # Pagination helpers
└── profile-button.utils.ts         # Profile UI helpers

lib/utils/                          # Framework-integrated utilities
├── index.ts                        # cn() class name merger
├── api-error.ts                    # Safe API error responses
├── bot-detection.ts                # User-Agent bot detection
├── checkout-utils.ts               # Payment checkout helpers
├── client-auth.ts                  # Client-side auth utilities
├── currency-format.ts              # Currency formatting
├── custom-navigation.ts            # Navigation helpers
├── database-check.ts               # Database connectivity check
├── email-validation.ts             # ReDoS-safe email validation
├── error-handler.ts                # Error handling utilities
├── featured-items.ts               # Featured item sorting/filtering
├── footer-utils.ts                 # Footer content utilities
├── image-domains.ts                # Image domain whitelist
├── pagination-validation.ts        # Server-side pagination validation
├── payment-provider.ts             # Payment provider detection
├── plan-expiration.utils.ts        # Plan expiration calculations
├── rate-limit.ts                   # In-memory rate limiter
├── request-body.ts                 # Request body parsing
├── server-url.ts                   # Server URL resolution
├── settings.ts                     # Settings helpers
├── slug.ts                         # URL slug utilities
├── url-cleaner.ts                  # URL cleaning and validation
├── url-filter-sync.ts              # URL/filter state synchronization
├── twenty-crm-client.utils.ts      # Twenty CRM client utils
└── twenty-crm-validation.ts        # Twenty CRM validation
```

## أدوات التاريخ (`utils/date.ts`)

### formatDate

تنسيق التاريخ بالشهر واليوم والسنة الطويلة.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formatDateTime

تنسيق التاريخ بالشهر واليوم والسنة والساعة والدقيقة الطويلة.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formatDateShort

التنسيقات ذات الشهر القصير. إرجاع `'-'` للقيم الخالية/غير المحددة.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## ترقيم الصفحات (`utils/pagination.ts`)

### clamAndScrollToTop

تثبيت رقم الصفحة على نطاق صالح وتمرير النافذة إلى الأعلى.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|المعلمة|اكتب|الوصف|
|---|---|---|
|`newPage`|`number`|رقم الصفحة المطلوبة|
|`total`|`number`|إجمالي عدد الصفحات|
|`setPage`|`(page: number) => void`|وظيفة واضعة الدولة|

السلوك: يتم ضبط المشابك على `[1, total]`، ويتعامل مع `NaN` افتراضيًا على 1، ويقوم بالتمرير السلس إلى الأعلى.

## الأدوات المساعدة لزر الملف الشخصي (`utils/profile-button.utils.ts`)

### formatDisplayName

تنسيقات عرض الأسماء بذكاء بناءً على الطول:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### getInitials

استخراج الأحرف الأولى من الاسم:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### getProfilePath

إنشاء مسار ملف تعريف آمن لعنوان URL:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### getThemeColors

إرجاع ألوان السمة الحالية لتراكبات واجهة المستخدم:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## دمج اسم الفئة (`lib/utils/index.ts`)

### cn

يجمع فئات Tailwind CSS مع حل التعارض:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

يستخدم `clsx` للفئات الشرطية و`tailwind-merge` لحل التعارض.

## معالجة أخطاء واجهة برمجة التطبيقات (`lib/utils/api-error.ts`)

### رد آمن

ينشئ استجابات للأخطاء تمنع تسرب المعلومات في الإنتاج:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|البيئة|الرد يحتوي على|
|---|---|
|التنمية|الفعلي `error.message`|
|الإنتاج|عام `fallbackMessage` فقط|

يتم دائمًا تسجيل تفاصيل الخطأ الكاملة من جانب الخادم بغض النظر عن البيئة.

### رسالة آمنة

استخراج سلسلة رسائل خطأ آمنة دون إنشاء استجابة:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## التحقق من صحة البريد الإلكتروني (`lib/utils/email-validation.ts`)

### isValidEmail

التحقق من صحة البريد الإلكتروني الآمن لـ ReDoS باستخدام التحليل اليدوي (لا يوجد تعبير عادي ضعيف):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

قواعد التحقق:
- يتراوح الطول بين 5 و254 حرفًا
- الجزء المحلي: 1-64 حرفًا، أبجديًا رقميًا + أحرف خاصة مسموح بها
- المجال: بنية صالحة بنقطة واحدة على الأقل
- كل تسمية نطاق: من 1 إلى 63 حرفًا، تبدأ/تنتهي بأبجدية رقمية

### isValidEmailRegex

التحقق البديل القائم على التعبير العادي (أيضًا آمن لـ ReDoS):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## تنسيق العملة (`lib/utils/currency-format.ts`)

### فورماتكورنسي

تنسيق مبالغ الوحدات الثانوية (سنتات) إلى سلاسل العملة المحلية:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formatCurrencyAmount

تنسيق مبالغ الوحدات الرئيسية (بالدولار) إلى سلاسل العملة المحلية:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### getCurrencySymbol

إرجاع رمز رمز العملة:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

يدعم 22 عملة بما في ذلك الدولار الأمريكي، واليورو، والجنيه الإسترليني، والين الياباني، واليوان الصيني، والدولار الكندي، والدولار الأسترالي، والفرنك السويسري، والروبية الهندية، والريال البرازيلي، والبيزو المكسيكي، والوون الكوري الجنوبي، والمزيد.

## الأدوات المساعدة (`lib/utils/slug.ts`)

### slugify

يحول النص إلى روابط ثابتة صديقة لعنوان URL:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### com.deslugify

يحول القطع الثابتة مرة أخرى إلى نص قابل للقراءة:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## أدوات URL المساعدة (`lib/utils/url-cleaner.ts`)

### com.cleanUrl

تنظيف وتطبيع سلاسل URL:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

التحقق من أن عنوان URL مطلق مع البروتوكول واسم المضيف:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### getBaseUrl

إرجاع عنوان URL الأساسي للتطبيق الذي تمت تسويته بسلسلة احتياطية:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### buildUrl

إنشاء عناوين URL كاملة من مقاطع المسار:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## تحديد المعدل (`lib/utils/rate-limit.ts`)

### Ratelimit

محدد معدل الذاكرة في نقاط نهاية API:

```typescript
import { ratelimit } from '@/lib/utils/rate-limit';

const result = await ratelimit(
  `api:${clientIP}`,  // Unique key
  100,                // Max requests
  60 * 1000           // Window: 1 minute
);

if (!result.success) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': String(result.retryAfter) }
  });
}
```

نوع الإرجاع:

```typescript
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // Seconds until reset (only when limited)
}
```

### إعادة تعيينRateLimit / getRateLimitStatus

```typescript
resetRateLimit('api:192.168.1.1');     // Clear rate limit for key

const status = getRateLimitStatus('api:192.168.1.1', 100);
// { remaining: 95, resetTime: 1706000000000 }
```

يتم تنظيف المتجر تلقائيا كل 5 دقائق.

## التحقق من صحة الصفحات (`lib/utils/pagination-validation.ts`)

### validatePaginationParams

التحقق من صحة معلمة ترقيم الصفحات من جانب الخادم لتوجيهات واجهة برمجة التطبيقات:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

قواعد التحقق:
- `page`: يجب أن يكون عددًا صحيحًا موجبًا (الافتراضي: 1)
- `limit`: يجب أن يكون بين 1 و100 (الافتراضي: 10)

## اكتشاف الروبوت (`lib/utils/bot-detection.ts`)

### isBot

يكتشف الروبوتات عن طريق سلسلة وكيل المستخدم:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

الفئات المكتشفة: محركات البحث، وبرامج زحف الوسائط الاجتماعية، وأدوات الأداء، وأطر التشغيل الآلي، وعملاء HTTP.

## العناصر المميزة (`lib/utils/featured-items.ts`)

### SortItemsWithFeatured

وضع العناصر المميزة في بداية القائمة، مرتبة حسب ترتيب العناصر المميزة:

```typescript
const sorted = sortItemsWithFeatured(allItems, featuredItems);
// Featured items first (by order), then remaining items
```

### isItemFeatured / getFeaturedItemData

```typescript
const featured = isItemFeatured('my-item', featuredItems);  // boolean
const data = getFeaturedItemData('my-item', featuredItems);  // FeaturedItem | undefined
```

### filterActiveFeaturedItems

يزيل العناصر المميزة منتهية الصلاحية بناءً على تاريخ `featuredUntil`.

### isFeaturedItemExpiring

يتحقق مما إذا كانت صلاحية العنصر المميز تنتهي خلال 7 أيام.

## عنوان URL للخادم (`lib/utils/server-url.ts`)

### getFrontendUrl

يحل عنوان URL للواجهة الأمامية من سياق الطلب الحالي:

```typescript
const url = await getFrontendUrl();
```

ترتيب القرار:
1. `window.location.origin` (جانب العميل)
2. `x-forwarded-host` / `host` الرؤوس (من جانب الخادم، تم التحقق من صحتها مقابل التكوين)
3. تم تكوين `WEB_URL` احتياطي

## جدول ملخص

|الوحدة النمطية|الصادرات الرئيسية|الفئة|
|---|---|---|
|`utils/date`|`formatDate`، `formatDateTime`، `formatDateShort`|التنسيق|
|`utils/pagination`|`clampAndScrollToTop`|مساعدي واجهة المستخدم|
|`utils/profile-button.utils`|`formatDisplayName`، `getInitials`، `getProfilePath`|مساعدي واجهة المستخدم|
|`lib/utils/index`|`cn`|التصميم|
|`lib/utils/api-error`|`safeErrorResponse`، `safeErrorMessage`|معالجة الأخطاء|
|`lib/utils/bot-detection`|`isBot`|الأمن|
|`lib/utils/currency-format`|`formatCurrency`، `formatCurrencyAmount`، `getCurrencySymbol`|التنسيق|
|`lib/utils/email-validation`|`isValidEmail`، `isValidEmailRegex`|التحقق من الصحة|
|`lib/utils/featured-items`|`sortItemsWithFeatured`، `filterActiveFeaturedItems`|البيانات|
|`lib/utils/pagination-validation`|`validatePaginationParams`|التحقق من الصحة|
|`lib/utils/rate-limit`|`ratelimit`، `resetRateLimit`|الأمن|
|`lib/utils/server-url`|`getFrontendUrl`|البنية التحتية|
|`lib/utils/slug`|`slugify`، `deslugify`|التنسيق|
|`lib/utils/url-cleaner`|`cleanUrl`، `getBaseUrl`، `buildUrl`|البنية التحتية|
