---
id: monitoring
title: ניטור ואנליטיקה
sidebar_label: ניטור
sidebar_position: 6
---

# ניטור ואנליטיקה

תבנית Ever Works משלבת מספר כלי ניטור ואנליטיקה לתצפיתיות בייצור: **Sentry** (מעקב שגיאות), **PostHog** (אנליטיקת מוצר), ו-**Google Analytics** (אנליטיקת תנועה).

## Sentry – מעקב שגיאות

### סקירה

הגדרת Sentry מפוצלת על פני שלושה קבצים:

| קובץ | מטרה |
|------|------|
| `sentry.config.ts` | הגדרה בצד לקוח (דפדפן) |
| `instrumentation.ts` | הגדרה בצד שרת (סביבת ריצה Node.js) |
| `next.config.ts` | תוסף Sentry Webpack להעלאת Source Maps |

### משתני סביבה

```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
```

### תכונות נתמכות

| תכונה | תיאור |
|-------|-------|
| **מעקב שגיאות** | לכידה אוטומטית של חריגות לא מטופלות |
| **ביצועים** | מעקב אחר טרנזקציות ו-Spans |
| **Source Maps** | העלאה דרך `SENTRY_AUTH_TOKEN` |
| **Session Replay** | הקלטת סשנים לניפוי שגיאות |
| **ניטור Cron** | מעקב אחר ביצוע משימות מתוזמנות |

### דוגמת הגדרה

```typescript
// sentry.config.ts (client)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,   // Adjust in production (e.g., 0.1)
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
```

### אימות Sentry

```bash
# Test error capture
curl -X POST https://yourdomain.com/api/test-error

# Check Sentry dashboard
https://sentry.io/organizations/{ORG}/issues/
```

## PostHog – אנליטיקת מוצר

### סקירה

PostHog משולב דרך מודול מותאם אישית ב-`lib/analytics/` ורכיב ספק ב-`components/analytics/`.

### משתני סביבה

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**אירוח עצמי של PostHog:**

```bash
NEXT_PUBLIC_POSTHOG_HOST=https://posthog.yourdomain.com
```

### מה נעקב

| אירוע | מתי מוצת |
|-------|---------|
| `user_signed_up` | רישום משתמש חדש |
| `user_logged_in` | התחברות מוצלחת |
| `subscription_created` | יצירת מנוי חדש |
| `subscription_cancelled` | ביטול מנוי |
| `content_synced` | השלמת סנכרון מאגר תוכן |
| `item_viewed` | חבר צופה בפריט בספרייה |
| `item_favorited` | הוספת פריט למועדפים |
| `comment_created` | פרסום תגובה חדשה |
| `payment_completed` | תשלום מוצלח |

### דגלי תכונות

שלוט בהשקת תכונות דרך דגלי תכונות של PostHog:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

function MyComponent() {
  const isEnabled = useFeatureFlag('new-feature');
  if (!isEnabled) return null;
  return <NewFeature />;
}
```

### הגנה על פרטיות

PostHog מוגדר להגנה על מידע אישי:

```typescript
// lib/analytics/posthog.ts
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  capture_pageview: false,  // Manual control
  capture_pageleave: true,
  mask_all_text: false,
  disable_session_recording: false,
  sanitize_properties: (properties) => {
    // Remove PII fields before sending
    delete properties['$email'];
    delete properties['$phone'];
    return properties;
  }
});
```

## Google Analytics – אנליטיקת תנועה

### משתני סביבה

```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### מה נעקב

GA4 עוקב אוטומטית אחר:

- **צפיות בדפים** – כל שינויי נתיב
- **מדדי מעורבות** – גלילה, לחיצות וזמן שהייה
- **מאפייני משתמש** – מיקום, מכשיר וסוג דפדפן
- **אירועי המרה** – מוגדרים דרך אירועים מותאמים בקוד

### השבתת מעקב (הגנת פרטיות)

עבור משתמשים שלא קיבלו מעקב, כיבוד הגדרות ההסכמה:

```typescript
// lib/analytics/google-analytics.ts
if (typeof window !== 'undefined' && window.gtag) {
  window.gtag('consent', 'update', {
    analytics_storage: userConsented ? 'granted' : 'denied',
  });
}
```

## ניטור בריאות אפליקציה

### נקודת קצה לבדיקת בריאות

```bash
GET /api/health
```

דוגמת תגובה:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Vercel Analytics

הפעל אנליטיקה מובנית בהגדרות פרויקט Vercel:

1. עבור אל **פרויקט** → **אנליטיקה**
2. הפעל **Web Analytics**
3. הפעל **Speed Insights**

### התראות והודעות

הגדרת התראות ב-Sentry:

1. עבור אל **התראות** → **צור כלל התראה**
2. הגדר תנאים (למשל: שיעור שגיאות > 10/דקה)
3. הגדר ערוצי הודעות (אימייל, Slack וכו')

הגדרה ב-PostHog:

1. עבור אל **הודעות** → **צור הודעה**
2. הגדר מדד (למשל: ירידה חדה במשתמשים פעילים)
3. הגדר נמענים

## שיטות עבודה מומלצות לתצפיתיות

### לוגים מובנים

השתמש בלוגים מובנים לאגירת לוגים קלה יותר:

```typescript
// ✅ Good: structured log with context
console.log(JSON.stringify({
  level: 'info',
  message: 'Subscription created',
  userId: user.id,
  planId: plan.id,
  timestamp: new Date().toISOString(),
}));

// ❌ Avoid: unstructured log
console.log('User ' + user.id + ' subscribed to ' + plan.id);
```

### מדדי ייצור קריטיים

עקוב אחר מדדים קריטיים אלו:

| מדד | סף התראה | סיבה |
|-----|---------|------|
| שיעור שגיאות | > 1% | משתמשים מושפעים ישירות |
| P95 זמן תגובה | > 3 שניות | פגיעה בחוויה |
| P99 מסד נתונים | > 1 שנייה | צוואר בקבוק בביצועים |
| כישלון משימת Cron | כל כישלון | בעיות עקביות נתונים |
| שימוש בזיכרון | > 80% | סיכון לאי-יציבות |
