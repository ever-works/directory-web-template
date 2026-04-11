---
id: recaptcha
title: שילוב reCAPTCHA
sidebar_label: reCAPTCHA
sidebar_position: 24
---

# שילוב reCAPTCHA

התבנית משלבת את Google reCAPTCHA v3 להגנה על בוטים בתהליכי אימות ותזרימי שליחת טפסים. הוא כולל נקודת קצה לאימות בצד השרת, ווים בצד הלקוח לניהול אסימון, ומצב פיתוח שעוקף אימות כאשר אישורים אינם מוגדרים.

## סקירה כללית של אדריכלות

```
app/api/verify-recaptcha/
  route.ts                          -- Server-side token verification endpoint

app/[locale]/auth/hooks/
  useRecaptchaVerification.ts       -- React Query mutation for verification
  useAutoRecaptchaVerification.ts   -- Auto-trigger on mount or condition

lib/api/
  server-api-client.ts              -- externalClient used for Google API calls

lib/config/
  config-service.ts                 -- analyticsConfig.recaptcha.secretKey
```

## נקודת קצה לאימות בצד השרת

המסלול `POST /api/verify-recaptcha` ב- `app/api/verify-recaptcha/route.ts` מטפל באימות אסימון מול Google reCAPTCHA API:

```tsx
// app/api/verify-recaptcha/route.ts
import { NextRequest, NextResponse } from "next/server";
import { externalClient, apiUtils } from "@/lib/api/server-api-client";
import { coreConfig, analyticsConfig } from "@/lib/config/config-service";

interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA token is required" },
        { status: 400 }
      );
    }

    const secretKey = analyticsConfig.recaptcha.secretKey;
    if (!secretKey) {
      if (coreConfig.NODE_ENV === "development") {
        console.warn(
          "[ReCAPTCHA] WARNING: Secret key not configured -- bypassing verification in development mode."
        );
        return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
      }
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA not configured" },
        { status: 500 }
      );
    }

    const response = await externalClient.postForm<RecaptchaApiResponse>(
      "https://www.google.com/recaptcha/api/siteverify",
      { secret: secretKey, response: token }
    );

    if (!apiUtils.isSuccess(response)) {
      console.error("ReCAPTCHA API request failed:", apiUtils.getErrorMessage(response));
      return NextResponse.json(
        { success: false, error: "Failed to verify ReCAPTCHA" },
        { status: 500 }
      );
    }

    const data = response.data;

    return NextResponse.json({
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts,
      error_codes: data['error-codes'],
    });
  } catch (error) {
    console.error("ReCAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
```

### פרטי יישום מרכזיים

- **אימות אסימון**: מחזיר 400 אם לא מסופק אסימון בגוף הבקשה.
- **מעקף פיתוח**: כאשר המפתח הסודי אינו מוגדר ו- `NODE_ENV` הוא `development` , נקודת הקצה מחזירה תגובה מוצלחת עם `score: 1.0` ו `action: "bypass"` מבלי ליצור קשר עם Google.
- **לקוח חיצוני**: משתמש ב- `externalClient` המוגדר מראש מ- `lib/api/server-api-client.ts` עם שיטת `postForm` שלו, אשר שולחת `application/x-www-form-urlencoded` נתונים ל-API לאימות של גוגל.
- **שירותי API**: משתמש ב- `apiUtils.isSuccess()` ו- `apiUtils.getErrorMessage()` לטיפול עקבי בתגובה.
- **העברת תגובה מלאה**: מחזירה את תוצאת האימות המלאה כולל ניקוד, פעולה, שם מארח, חותמת זמן של אתגר וקודי שגיאה.

### מעקף מצב פיתוח

כאשר `RECAPTCHA_SECRET_KEY` אינו מוגדר והאפליקציה פועלת במצב פיתוח, נקודת הקצה עוקפת אוטומטית את האימות:

```tsx
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

בהפקה, מפתח סודי חסר מחזיר שגיאת 500 במקום לעקוף בשקט.

## וו אימות בצד הלקוח

הוו `useRecaptchaVerification` ב- `app/[locale]/auth/hooks/useRecaptchaVerification.ts` עוטף את שיחת האימות במוטציה של React Query:

```tsx
// app/[locale]/auth/hooks/useRecaptchaVerification.ts
import { useMutation } from '@tanstack/react-query';

function useRecaptchaVerification() {
  const mutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('reCAPTCHA verification failed');
      }

      return response.json();
    },
  });

  return {
    verifyRecaptcha: mutation.mutateAsync,
    isVerifying: mutation.isPending,
    isVerified: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}
```

### ערכי החזרה

| נכס | הקלד | תיאור |
|--------|------|--------|
| `verifyRecaptcha` | `(token: string) => Promise` | פונקציית מוטציה לאימות אסימון |
| `isVerifying` | `boolean` | האם האימות מתבצע |
| `isVerified` | `boolean` | האם האימות הצליח |
| `error` | `Error or null` | שגיאה מניסיון האימות האחרון |
| `reset` | `() => void` | אפס מצב אימות |

## וו אימות אוטומטי

ה- `useAutoRecaptchaVerification` מפעיל אימות reCAPTCHA באופן אוטומטי כאשר רכיב עולה או כאשר תנאי מתקיים:

```tsx
function useAutoRecaptchaVerification(options?: {
  action?: string;       // reCAPTCHA action name (default: 'submit')
  enabled?: boolean;     // Whether to auto-verify (default: true)
}): {
  isVerified: boolean;
  isVerifying: boolean;
  error: Error | null;
  token: string | null;
}
```

### דוגמה לשימוש

```tsx
function ProtectedForm() {
  const { isVerified, isVerifying } = useAutoRecaptchaVerification({
    action: 'login',
    enabled: true,
  });

  return (
    <form>
      {/* Form fields */}
      <button disabled={!isVerified || isVerifying}>
        {isVerifying ? 'Verifying...' : 'Submit'}
      </button>
    </form>
  );
}
```

## שילוב של Google API

נקודת הקצה מתקשרת עם API reCAPTCHA של גוגל בשיטת `externalClient.postForm` מ- `lib/api/server-api-client.ts` . שיטה זו שולחת נתוני טופס מקודדים בכתובת URL:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

ה- `externalClient` הוא מופע `ServerClient` מוגדר מראש המיועד לשיחות API חיצוניות. שיטת `postForm` מטפלת בסוג התוכן `application/x-www-form-urlencoded` באופן אוטומטי.

### פירוש הציון

reCAPTCHA v3 מחזיר ציון בין 0.0 ל-1.0:

| טווח ניקוד | פרשנות | פעולה טיפוסית |
|------------|----------------|----------------|
| 0.7 - 1.0 | אנושי כנראה | אפשר הגשה |
| 0.3 - 0.7 | לא בטוח | עשוי לדרוש אימות נוסף |
| 0.0 - 0.3 | סביר בוט | חסימת הגשה |

## אינטגרציה עם אימות

הרכיב `CredentialsForm` משתמש באימות reCAPTCHA לפני שליחת אישורים:

```tsx
function CredentialsForm({ type, onSuccess }) {
  const { verifyRecaptcha, isVerifying } = useRecaptchaVerification();

  const handleSubmit = async (formData: FormData) => {
    const token = await grecaptcha.execute(siteKey, { action: type });
    const result = await verifyRecaptcha(token);

    if (!result.verified) {
      toast.error('Verification failed. Please try again.');
      return;
    }

    await signIn(formData);
  };
}
```

## משתני סביבה

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

אל המפתח הסודי ניתן לגשת דרך `analyticsConfig.recaptcha.secretKey` משירות התצורה המרוכז, ולא ישירות מ `process.env` .

## תיעוד Swagger

נקודת הקצה של האימות כוללת הערות מקיפות של Swagger/JSDoc המתעדות את כל סכימות הבקשות והתגובה, קודי המצב והדוגמאות. זה מוגש באמצעות מערכת תיעוד ה-API המובנית של התבנית.

## הפעלה מותנית

| מצב | התנהגות |
|----------------|--------|
| סט מפתחות סודי | אימות מלא מול Google API |
| מפתח סודי חסר, מצב פיתוח | מעקף אוטומטי עם `success: true` |
| מפתח סודי חסר, מצב ייצור | מחזירה שגיאה 500 |
| מפתח אתר לא מוגדר בלקוח | הסקריפט לא נטען, הטפסים נשלחים ללא אימות |

## טיפול בשגיאות

נקודת הקצה מטפלת בשלוש קטגוריות של שגיאות:

1. **שגיאות לקוח (400)**: אסימון חסר או לא חוקי בגוף הבקשה
2. **שגיאות תצורה (500)**: חסר מפתח סודי בייצור
3. **שגיאות במעלה הזרם (500)**: כשלים בבקשות של Google API או חריגים בלתי צפויים

כל השגיאות נרשמות למסוף השרת ומחזירות מבנה JSON עקבי עם `success: false` והודעה `error` .

## הפניה לקובץ

| קובץ | מטרה |
|------|--------|
| `app/api/verify-recaptcha/route.ts` | נקודת קצה לאימות בצד השרת |
| `app/[locale]/auth/hooks/useRecaptchaVerification.ts` | מוטציית אימות שאילתה תגובה |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | וו אימות הפעלה אוטומטית |
| `lib/api/server-api-client.ts` | שיטת `externalClient` ו `postForm` |
| `lib/config/config-service.ts` | `analyticsConfig.recaptcha.secretKey` |
