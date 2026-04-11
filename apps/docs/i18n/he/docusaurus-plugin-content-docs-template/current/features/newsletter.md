---
id: newsletter
title: מערכת ניוזלטר
sidebar_label: ניוזלטר
sidebar_position: 5
---

# מערכת ניוזלטר

תבנית Ever Works כוללת מערכת מנוי לניוזלטר עם שילוב דוא"ל, מקורות מנויים מרובים וסטטיסטיקות מנהל.

## תצורה

ממוקמת בכתובת `lib/newsletter/config.ts` , מערכת הניוזלטר מספקת תצורה מרכזית:

```typescript
const NEWSLETTER_CONFIG = {
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",

  SOURCES: {
    FOOTER: "footer",       // Footer subscription form
    POPUP: "popup",         // Popup/modal subscription
    SIGNUP: "signup",       // Account registration
  },
};
```

### הגדרת ספק דוא"ל

הניוזלטר משתמש באותו ספק דוא"ל כמו מערכת ההתראות:

```typescript
interface EmailConfig {
  provider: string;        // "resend" or "novu"
  defaultFrom: string;     // Sender email address
  domain: string;          // App domain
  apiKeys: {
    resend: string;        // RESEND_API_KEY
    novu: string;          // NOVU_API_KEY
  };
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}
```

התצורה נפתרת מתצורת האתר עם חזרות למשתני סביבה:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## ניהול מנויים

### אימות

כתובות דוא"ל מאומתות ומנורמלות באמצעות סכימות Zod:

```typescript
import { emailSchema, newsletterSubscriptionSchema } from '@/lib/newsletter/config';

// Simple email validation
const result = emailSchema.parse({ email: "user@example.com" });

// Full subscription validation (includes source)
const subscription = newsletterSubscriptionSchema.parse({
  email: "user@example.com",
  source: "footer",
});
```

הודעות דוא"ל נמוכות אוטומטית באותיות קטנות ונחתכות במהלך האימות.

### מקורות מנוי

כל מנוי מתעד היכן המשתמש נרשם:

| מקור | מיקום | תיאור |
|--------|--------|----------------|
| `footer` | כותרת תחתונה של האתר | טופס הרשמה גלוי תמיד |
| `popup` | מודאלי/פופאפ | הודעת מנוי שהופעלה |
| `signup` | הרשמה | הצטרפות במהלך יצירת החשבון |

### סטטיסטיקה

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## נקודות קצה של ממשק API

| שיטה | נקודת קצה | תיאור |
|--------|--------|----------------|
| פוסט | `/api/newsletter` | הירשם לניוזלטר |
| מחק | `/api/newsletter` | בטל הרשמה לניוזלטר |
| קבל | `/api/newsletter/stats` | קבל סטטיסטיקות מנויים (אדמין) |

## הודעות שגיאה

המערכת מספקת הודעות שגיאה עקביות וידידותיות למשתמש:

| קוד | הודעה |
|------|--------|
| `INVALID_EMAIL` | נא להזין כתובת דוא"ל חוקית |
| `ALREADY_SUBSCRIBED` | האימייל כבר רשום לניוזלטר |
| `NOT_SUBSCRIBED` | המייל אינו רשום לניוזלטר |
| `SUBSCRIPTION_FAILED` | יצירת המנוי נכשלה. אנא נסה שוב. |

## פונקציות שירות

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
