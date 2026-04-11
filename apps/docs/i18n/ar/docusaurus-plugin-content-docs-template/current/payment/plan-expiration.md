---
id: plan-expiration
title: أدوات انتهاء صلاحية الخطة
sidebar_label: انتهاء صلاحية الخطة
sidebar_position: 8
---

# خطة المرافق انتهاء الصلاحية

توفر الوحدة `plan-expiration.utils` ( `lib/utils/plan-expiration.utils.ts` ) منطقًا مركزيًا للتعامل مع انتهاء صلاحية خطة الاشتراك. يقوم بحساب حالة انتهاء الصلاحية وفترات السماح ونوافذ التحذير ومستويات الخطة الفعالة. يتم استخدام هذه الأدوات المساعدة عبر كل من الواجهة الخلفية والواجهة الأمامية للحصول على سلوك متسق.

## التكوين

تقوم الوحدة بتصدير كائن تكوين بقيم افتراضية:

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

يمكن تجاوز كلتا القيمتين على أساس كل مكالمة عبر معلمات الوظيفة.

## الوظائف الأساسية

### انتهت صلاحية الخطة

التحقق من انتهاء صلاحية الاشتراك بناءً على تاريخ انتهائه، مع فترة سماح اختيارية:

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

#### تطبيق

```ts
export function isPlanExpired(
  endDate: Date | string | null | undefined,
  gracePeriodDays: number = EXPIRATION_CONFIG.GRACE_PERIOD_DAYS
): boolean {
  if (!endDate) return false;

  const expirationDate =
    typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(expirationDate.getTime())) return false;

  const now = new Date();
  const graceEndDate = new Date(expirationDate);
  graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

  return now > graceEndDate;
}
```

السلوكيات الرئيسية:
- إرجاع 0 لتواريخ الانتهاء 1 أو 2 (لا تنتهي صلاحية الخطة أبدًا)
- إرجاع `false` لسلاسل التاريخ غير الصالحة
- يقبل كلاً من الكائنات 4 وسلاسل تاريخ ISO
- فترة السماح تمتد لتاريخ انتهاء الصلاحية الفعلي

### احصل على الخطة الفعالة

يحدد الخطة الفعلية التي يجب أن يتمكن المستخدم من الوصول إليها، مع الأخذ في الاعتبار انتهاء الصلاحية والحالة:

```ts
import { getEffectivePlan } from '@/lib/utils/plan-expiration.utils';

// Active paid plan
getEffectivePlan('pro', new Date('2099-12-31'));
// "pro"

// Expired paid plan falls back to FREE
getEffectivePlan('pro', new Date('2024-01-01'));
// "free"

// Free plan never expires
getEffectivePlan('free', null);
// "free"

// Explicitly cancelled
getEffectivePlan('pro', new Date('2099-12-31'), 'cancelled');
// "free"
```

#### تطبيق

```ts
export function getEffectivePlan(
  planId: string,
  endDate: Date | string | null | undefined,
  status?: string
): string {
  // Free plan never expires
  if (planId === PaymentPlan.FREE) {
    return PaymentPlan.FREE;
  }

  // Explicit status check
  if (
    status &&
    ['expired', 'cancelled'].includes(status.toLowerCase())
  ) {
    return PaymentPlan.FREE;
  }

  // Date-based expiration check
  if (isPlanExpired(endDate)) {
    return PaymentPlan.FREE;
  }

  return planId;
}
```

تطبق الوظيفة ثلاث عمليات فحص بالترتيب:

1. **تجاوز الخطة المجانية** - يتم دائمًا إرجاع الخطط المجانية كما هي
2. **الحالة الصريحة** - إذا كانت الحالة `"expired"` أو `"cancelled"` ، يحصل المستخدم على مجانًا
3. **التحقق من التاريخ** - إذا انقضى تاريخ الانتهاء، يحصل المستخدم على مجانًا

### getDaysUntilExpiration

حساب عدد الأيام الكاملة حتى انتهاء صلاحية الاشتراك:

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

#### تطبيق

```ts
export function getDaysUntilExpiration(
  endDate: Date | string | null | undefined
): number | null {
  if (!endDate) return null;

  const expirationDate =
    typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(expirationDate.getTime())) return null;

  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
```

تستخدم الوظيفة `Math.floor` لحساب الأيام الكاملة المتبقية. وهذا يعني أن الاشتراك الذي تنتهي صلاحيته خلال ساعة واحدة يعود 1 (تنتهي صلاحيته اليوم)، وليس 2.

### isInExpirationWarningPeriod

التحقق مما إذا كان الاشتراك ضمن نافذة التحذير قبل انتهاء الصلاحية:

```ts
import { isInExpirationWarningPeriod } from '@/lib/utils/plan-expiration.utils';

// Expires in 5 days with default 7-day warning
isInExpirationWarningPeriod(fiveDaysFromNow);   // true

// Expires in 10 days
isInExpirationWarningPeriod(tenDaysFromNow);    // false

// Already expired
isInExpirationWarningPeriod(yesterday);          // false

// Custom warning window
isInExpirationWarningPeriod(threeDaysFromNow, 3); // true
```

ترجع الوظيفة `true` فقط عندما تكون الخطة **لم تنته صلاحيتها بعد** ولكنها تكون ضمن نافذة التحذير. تعود الخطط منتهية الصلاحية بالفعل `false` .

### isInGracePeriod

التحقق مما إذا كان الاشتراك في فترة السماح بعد انتهاء الصلاحية:

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

فترة السماح هي النافذة **بعد** انتهاء الصلاحية حيث لا يزال لدى المستخدمين إمكانية وصول محدودة. مع القيمة الافتراضية `GRACE_PERIOD_DAYS` من `0` ، ترجع هذه الوظيفة دائمًا `false` .

### getPlanStatusInfo

إرجاع كائن حالة شامل يجمع كل عمليات التحقق من انتهاء الصلاحية في مكالمة واحدة:

```ts
import { getPlanStatusInfo } from '@/lib/utils/plan-expiration.utils';

const status = getPlanStatusInfo('pro', new Date('2025-04-01'));
// {
//   planId: 'pro',
//   effectivePlan: 'pro',       // or 'free' if expired
//   isExpired: false,
//   isInWarningPeriod: true,    // if within 7 days
//   isInGracePeriod: false,
//   daysUntilExpiration: 5,
//   expiresAt: Date,
//   canAccessPlanFeatures: true,
// }
```

#### نوع الإرجاع

```ts
{
  planId: string;               // Original plan ID
  effectivePlan: string;        // Actual plan after expiration logic
  isExpired: boolean;           // Whether the plan has expired
  isInWarningPeriod: boolean;   // Within warning days before expiration
  isInGracePeriod: boolean;     // In post-expiration grace period
  daysUntilExpiration: number | null;
  expiresAt: Date | null;       // Parsed expiration date
  canAccessPlanFeatures: boolean; // true if not expired OR in grace period
}
```

الحقل "0" هو حقل القرار الرئيسي: إنه "1" عندما يظل بإمكان المستخدم استخدام الميزات المدفوعة، إما لأن الخطة نشطة أو لأنها ضمن فترة السماح.

###formatExpirationMessage

يُنشئ رسائل انتهاء صلاحية يمكن قراءتها بواسطة الإنسان لعرض واجهة المستخدم:

```ts
import { formatExpirationMessage } from '@/lib/utils/plan-expiration.utils';

formatExpirationMessage('Pro', 0, false);
// "Your Pro subscription expires today."

formatExpirationMessage('Pro', 1, false);
// "Your Pro subscription expires tomorrow."

formatExpirationMessage('Pro', 5, false);
// "Your Pro subscription expires in 5 days."

formatExpirationMessage('Pro', -3, true);
// "Your Pro subscription has expired. Please renew to restore full access."

formatExpirationMessage('Pro', 30, false);
// null (outside warning period, no message needed)

formatExpirationMessage('Pro', null, false);
// null (no end date)
```

ترجع الوظيفة `null` عندما لا ينبغي عرض أي رسالة (خارج فترة التحذير ولم تنته صلاحيتها).

## أنماط الاستخدام

### حارس الطريق API

```ts
import { getEffectivePlan } from '@/lib/utils/plan-expiration.utils';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  const effectivePlan = getEffectivePlan(
    user.planId,
    user.subscriptionEndDate,
    user.subscriptionStatus
  );

  if (effectivePlan === 'free') {
    return Response.json(
      { error: 'This feature requires a paid plan' },
      { status: 403 }
    );
  }

  // Proceed with paid-tier logic
}
```

### مكون شعار انتهاء الصلاحية

```ts
import {
  getPlanStatusInfo,
  formatExpirationMessage,
} from '@/lib/utils/plan-expiration.utils';

function ExpirationBanner({ user }) {
  const status = getPlanStatusInfo(
    user.planId,
    user.subscriptionEndDate,
    user.subscriptionStatus
  );

  const message = formatExpirationMessage(
    user.planName,
    status.daysUntilExpiration,
    status.isExpired
  );

  if (!message) return null;

  return (
    <div className={status.isExpired ? 'bg-red-100' : 'bg-yellow-100'}>
      <p>{message}</p>
      <a href="/pricing">Renew Now</a>
    </div>
  );
}
```

### التحقق من الوصول إلى الميزة

```ts
import { getPlanStatusInfo } from '@/lib/utils/plan-expiration.utils';

function useCanAccessFeature(user) {
  const status = getPlanStatusInfo(
    user.planId,
    user.subscriptionEndDate
  );

  return status.canAccessPlanFeatures;
}
```

## تصور الجدول الزمني

تتدفق دورة حياة انتهاء الصلاحية من خلال هذه الحالات:

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## ملفات المصدر

| ملف | الغرض |
|------|---------|
| `lib/utils/plan-expiration.utils.ts` | منطق انتهاء الاشتراك |
| `lib/constants.ts` | `PaymentPlan` التعداد مع معرف الخطة المجانية |
