---
id: plan-expiration
title: כלי עזר לתפוגת תוכנית
sidebar_label: תפוגת תוכנית
sidebar_position: 8
---

# כלי עזר לתפוגת תוכנית

מודול `plan-expiration.utils` ( `lib/utils/plan-expiration.utils.ts` ) מספק לוגיקה מרוכזת לטיפול בתפוגת תוכנית מנוי. הוא מחשב את מצב התפוגה, תקופות חסד, חלונות אזהרה ורמות תוכנית יעילות. כלי עזר אלה משמשים הן בקצה האחורי והן בחזית הקצה להתנהגות עקבית.

## תצורה

המודול מייצא אובייקט תצורה עם ערכי ברירת מחדל:

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

ניתן לעקוף את שני הערכים על בסיס לכל קריאה באמצעות פרמטרים של פונקציה.

## פונקציות ליבה

### isPlanExpired

בודק אם פג תוקפו של מנוי על סמך תאריך הסיום שלו, עם תקופת חסד אופציונלית:

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

#### יישום

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

התנהגויות מפתח:
- מחזירה `false` עבור תאריכי סיום `null` או `undefined` (התוכנית לעולם לא תפוג)
- מחזירה `false` עבור מחרוזות תאריך לא חוקיות
- מקבל גם `Date` אובייקטים וגם מחרוזות תאריך ISO
- תקופת החסד מאריכה את תאריך התפוגה האפקטיבי

### getEffectivePlan

קובע את התוכנית בפועל שלמשתמש צריכה להיות גישה אליה, בהתחשב בתפוגה ובסטטוס:

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

#### יישום

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

הפונקציה מפעילה שלושה בדיקות לפי הסדר:

1. **עקיפת תוכנית חינמית** -- תוכניות חינם מוחזרות תמיד כפי שהן
2. **סטטוס מפורש** -- אם הסטטוס הוא `"expired"` או `"cancelled"` , המשתמש מקבל בחינם
3. **בדיקת תאריך** -- אם תאריך הסיום חלף, המשתמש מקבל בחינם

### getDaysUntilExpiration

מחשב את מספר הימים המלאים עד לפקיעת מנוי:

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

#### יישום

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

הפונקציה משתמשת ב- `Math.floor` כדי לספור ימים מלאים שנותרו. המשמעות היא שמנוי שיפוג בעוד שעה מחזיר `0` (יפוג היום), לא `1` .

### isInExpirationWarningPeriod

בודק אם המנוי נמצא בחלון האזהרה לפני תום התפוגה:

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

הפונקציה מחזירה `true` רק כאשר התוכנית **עדיין לא פג** אך נמצאת בחלון האזהרה. תוכניות שפג תוקפן חוזרות `false` .

### isInGracePeriod

בודק אם המנוי נמצא בתקופת החסד שלאחר התפוגה:

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

תקופת החסד היא החלון **לאחר** תפוגה שבו למשתמשים עדיין יש גישה מוגבלת. עם ברירת המחדל `GRACE_PERIOD_DAYS` של `0` , פונקציה זו תמיד מחזירה `false` .

### getPlanStatusInfo

מחזירה אובייקט סטטוס מקיף המשלב את כל בדיקות התפוגה לקריאה אחת:

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

#### סוג החזרה

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

השדה `canAccessPlanFeatures` הוא שדה ההחלטה המרכזי: הוא `true` כאשר המשתמש עדיין יכול להשתמש בתכונות בתשלום, בין אם בגלל שהתוכנית פעילה ובין אם בגלל שהם נמצאים בתקופת החסד.

### formatExpirationMessage

יוצר הודעות תפוגה הניתנות לקריאה על ידי אדם לתצוגת ממשק משתמש:

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

הפונקציה מחזירה `null` כאשר אין להציג הודעה (מחוץ לתקופת האזהרה ולא פג).

## דפוסי שימוש

### API Route Guard

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

### רכיב באנר תפוגה

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

### בדיקת גישה לתכונות

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

## הדמיית קו זמן

מחזור החיים של התפוגה זורם דרך המצבים הבאים:

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## קבצי מקור

| קובץ | מטרה |
|------|--------|
| `lib/utils/plan-expiration.utils.ts` | היגיון תפוגת מנוי |
| `lib/constants.ts` | `PaymentPlan` enum עם מזהה תוכנית בחינם |
