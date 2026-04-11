---
id: admin-analytics
title: Admin Analytics
sidebar_label: Admin Analytics
sidebar_position: 32
---

# Admin Analytics

מערכת הניתוח של המנהל מספקת סטטיסטיקות בפלטפורמה, מדדי מעורבות, מעקב אחר צמיחת משתמשים ועיבוד נתוני רקע. הוא משלב שאילתות מסד נתונים בזמן אמת, צבירות במטמון ושילוב PostHog אופציונלי לניתוח מקיף.

## סקירה כללית של אדריכלות

| מודול | נתיב | מטרה |
|--------|------|--------|
| מאגר סטטיסטיקות ניהול | `lib/repositories/admin-stats.repository.ts` | סטטיסטיקות ליבה של לוח המחוונים |
| שאילתות לוח המחוונים | `lib/db/queries/dashboard.queries.ts` | שאילתות צבירת מעורבות |
| שאילתות מעורבות | `lib/db/queries/engagement.queries.ts` | מדדי פריט |
| מעבד רקע של Analytics | `lib/services/analytics-background-processor.ts` | מתזמן משרות ברקע |
| לקוח Analytics | `lib/analytics/index.ts` | שילוב PostHog/Sentry בצד הלקוח |
| שירות API PostHog | `lib/services/posthog-api.service.ts` | שאילתות PostHog בצד השרת |
| ייצוא אנליטיקס | `lib/services/analytics-export.service.ts` | פונקציונליות ייצוא נתונים |
| דוחות מתוזמנים | `lib/services/analytics-scheduled-reports.service.ts` | הפקת דוחות אוטומטית |

## סטטיסטיקות של לוח המחוונים של מנהל המערכת

ה- `AdminStatsRepository` מקבץ ארבע קטגוריות סטטיסטיקות באמצעות `Promise.allSettled` לטעינת נתונים גמישים:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### סטטיסטיקת משתמשים

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

שאילתות משתמשות בגבולות תאריך מנורמל UTC כדי להבטיח תוצאות עקביות ללא קשר לאזור הזמן של השרת:

```ts
async getUserStats(): Promise<UserStats> {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekStartUtc = new Date(todayUtc);
  // Monday-start week
  weekStartUtc.setUTCDate(
    todayUtc.getUTCDate() - ((todayUtc.getUTCDay() + 6) % 7)
  );
  const monthStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [total, today, week, month] = await Promise.all([
    db.select({ count: count() }).from(users)
      .where(isNull(users.deletedAt)),
    db.select({ count: count() }).from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, todayUtc))),
    // ... week and month queries
  ]);
  // ...
}
```

### סטטיסטיקות הגשה

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

הוחזר משיטת `ItemRepository.getStats()` מאחר שהפריטים נמצאים ב-CMS מבוסס Git.

### סטטיסטיקת פעילות

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

תצוגות מקורן מ-PostHog כשהן מוגדרות, ויורדות לאפס:

```ts
const [totalVotesResult, totalCommentsResult, totalViews] =
  await Promise.all([
    db.select({ count: count() }).from(votes),
    db.select({ count: count() }).from(comments)
      .where(isNull(comments.deletedAt)),
    postHogApiService.isConfigured()
      ? postHogApiService.getTotalPageViews()
      : Promise.resolve(0),
  ]);
```

### סטטיסטיקת ניוזלטר

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## עיבוד רקע של אנליטיקה

ה- `AnalyticsBackgroundProcessor` מתזמן שש עבודות חוזרות:

```ts
const JOB_INTERVALS = {
  USER_GROWTH: 10 * 60 * 1000,      // 10 minutes
  ACTIVITY_TRENDS: 5 * 60 * 1000,    // 5 minutes
  TOP_ITEMS: 15 * 60 * 1000,        // 15 minutes
  RECENT_ACTIVITY: 2 * 60 * 1000,   // 2 minutes
  PERFORMANCE_METRICS: 30 * 1000,    // 30 seconds
  CACHE_CLEANUP: 60 * 60 * 1000,    // 1 hour
};
```

| עבודה | מרווח | מטרה |
|-----|--------|--------|
| צבירת גידול משתמשים | 10 דקות | מרענן מגמות צמיחת משתמשים |
| צבירת מגמות פעילות | 5 דקות | עדכון סדרת זמן מעורבות |
| דירוג פריטים מובילים | 15 דקות | מחשב מחדש את דירוג הפופולריות של פריטים |
| עדכון פעילות אחרון | 2 דקות | מרענן את פיד הפעילות האחרון |
| עדכון מדדי ביצועים | 30 שניות | עדכון נתוני ביצועים בזמן אמת |
| ניקוי מטמון | 1 שעה | מסיר צבירות מיושנות בקובץ שמור |

ניתן להשבית את העבודות על ידי הגדרת `DISABLE_AUTO_SYNC=true` .

כל עבודה עוקבת אחר הסטטוס שלה:

```ts
interface JobStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  lastRun: Date;
  nextRun: Date;
  duration: number;
  error?: string;
}
```

## מדדי מעורבות

### מדדים לכל פריט

הפונקציה `getEngagementMetricsPerItem` שואבת את כל המדדים במקביל:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

ארבע שאילתות מקבילות מבוצעות:

1. ספירות צפייה מ- `item_views` 2. ציוני הצבעה נטו מ- `votes` (הצבעה למעלה = +1, הצבעה כלפי מטה = -1)
3. ספירת מועדפים מ- `favorites` 4. ספירת תגובות ודירוגים ממוצעים מ- `comments` (לא כולל soft-מחיקה)

### ציון פופולריות

פריטים מקבלים ניקוד באמצעות אלגוריתם לוגריתמי:

```ts
// Approximate max scores at 1M interactions:
// Featured: 10,000 points (base boost)
// Views: ~6,000 points (weight: 1000)
// Votes: ~7,200 points (weight: 1200)
// Rating: 0-2,500 points (linear, 500 per star)
// Favorites: ~6,600 points (weight: 1100)
// Comments: ~6,000 points (weight: 1000)
// Recency: 0-1,750 points (decay over 180 days)
```

## ניתוח צד הלקוח

מחלקת יחידת `Analytics` ב- `lib/analytics/index.ts` מנהלת מעקב בצד הלקוח:

```ts
export class Analytics {
  init()                                    // Initialize PostHog
  identify(userId, properties?)             // Identify user
  track(eventName, properties?)             // Custom events
  trackPageView(url, properties?)           // Page views
  isFeatureEnabled(flagKey, defaultValue?)  // Feature flags
  captureException(error, context?)         // Error tracking
  setUserProperties(properties)             // User attributes
  setSuperProperties(properties)            // Global event properties
}
```

### ספקי מעקב חריגים

מודול הניתוח תומך בשלוש תצורות מעקב חריגים:

| ספק | תיאור |
|--------|----------------|
| `posthog` | שגיאות שנשלחו ל-PostHog בלבד |
| `sentry` | שגיאות שנשלחו ל- Sentry בלבד |
| `both` | שגיאות שנשלחו גם ל-PostHog וגם ל-Sentry |

הספק נקבע מ- `EXCEPTION_TRACKING_PROVIDER` עם נפילה אוטומטית אם הספק המוגדר אינו זמין.

### תצורת PostHog

```ts
const config = {
  api_host: POSTHOG_HOST,
  debug: POSTHOG_DEBUG,
  capture_pageview: POSTHOG_AUTO_CAPTURE,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-mask]",
    sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
  },
};
```

קצבי הדגימה שולטים באחוז הפעלות אחריהם, המוגדרים באמצעות משתני סביבה.

## שאילתות נתונים של לוח המחוונים

### מגמות מעורבות שבועיות

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

משתמש ב-PostgreSQL `to_char(date, 'IYYY-IW')` עבור קיבוץ שבועי ISO.

### פירוט פעילות יומית

```ts
export async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<
  Array<{
    date: string;
    submissions: number;
    views: number;
    engagement: number;
  }>
>
```

### פריטים בעלי ביצועים מובילים

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

הפריטים מדורגים לפי כלל מעורבות (הצבעות בתוספת הערות).

## טעינת נתונים גמישה

שיטת `getAllStats` משתמשת ב- `Promise.allSettled` כדי להבטיח שכשלים חלקיים לא ישברו את לוח המחוונים:

```ts
async getAllStats(): Promise<AdminDashboardStats> {
  const [u, s, a, n] = await Promise.allSettled([
    this.getUserStats(),
    this.getSubmissionStats(),
    this.getActivityStats(),
    this.getNewsletterStats(),
  ]);

  // Each section falls back to zero values on rejection
  const users =
    u.status === 'fulfilled'
      ? u.value
      : {
          totalUsers: 0,
          registeredUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0,
        };
  // ... similar for submissions, activity, newsletter
}
```

## דרישות הרשאה

תכונות אנליטיקה מסודרות על ידי מערכת ההרשאות:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

גישה לתכונה מבוססת תוכנית:

| תכונה | חינם | סטנדרטי | פרימיום |
|--------|------|--------|--------|
| צפה בסטטיסטיקה | לא | כן | כן |
| ניתוח מתקדם | לא | לא | כן |

## תיעוד קשור

- [Analytics Background](/docs/template/services/analytics-background) -- פרטי עיבוד ברקע
- [PostHog Service](/docs/template/services/posthog-service) -- ממשק API בצד השרת של PostHog
- [שירות ייצוא](/docs/template/services/export-service) -- ייצוא נתונים
- [שירות פעילות](/docs/template/services/activity-service) -- מעקב אחר פעילות משתמשים
- [שירות מעורבות](/docs/template/services/engagement-services) -- ניקוד פופולריות
