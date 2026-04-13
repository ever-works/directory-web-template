---
id: newsletter-endpoints
title: פעולות שרת ניוזלטר
sidebar_label: ניוזלטר
sidebar_position: 26
---

# פעולות שרת ניוזלטר

מערכת הניוזלטר משתמשת ב-Next.js Server Actions במקום במטפלי נתיב API מסורתיים. פעולות אלו מנהלות מנויי דוא"ל כולל הרשמה, ביטול הרשמה ואחזור סטטיסטיקות. הודעות דוא"ל נשלחות הן עבור אירועי הרשמה והן עבור ביטול הרישום באמצעות ספקי דוא"ל הניתנים להגדרה.

## סקירה כללית

|פעולה|Auth|תיאור|
|---|---|---|
|`subscribeToNewsletter`|ציבורי|הירשמו למייל לניוזלטר|
|`unsubscribeFromNewsletter`|ציבורי|בטל הרשמה למייל מהניוזלטר|
|`getNewsletterStatistics`|אין|קבל סטטיסטיקות מנויים|

אלו הן פעולות שרת המוגדרות עם `'use server'` ומופעלות מרכיבי React באמצעות שליחת טופס או קריאות ישירות, לא דרך נקודות קצה HTTP.

## פעולות שרת

### הירשם לניוזלטר

```typescript
subscribeToNewsletter(data: { email: string })
```

נרשם לכתובת דואר אלקטרוני לניוזלטר. מאמת את האימייל באמצעות Zod, בודק אם יש מנויים פעילים כפולים, יוצר את רשומת מסד הנתונים ושולח הודעת קבלת פנים. האימייל מנורמל אוטומטית לאותיות קטנות וחתוך.

**אימות קלט (זוד):**

|שדה|הקלד|חובה|אילוצים|
|---|---|---|---|
|`email`|מחרוזת|כן|חייב להיות פורמט אימייל חוקי|

**תגובת הצלחה:**

```json
{
  "success": true
}
```

**תגובות שגיאה:**

```json
{
  "error": "Email is already subscribed to the newsletter",
  "email": "user@example.com"
}
```

|שגיאה|מצב|
|---|---|
|`"Please enter a valid email address"`|פורמט דוא"ל לא חוקי (אימות Zod)|
|`"Email is already subscribed to the newsletter"`|מנוי פעיל כבר קיים|
|`"Failed to create subscription. Please try again."`|הוספת מסד הנתונים נכשלה|
|`"Failed to subscribe to newsletter. Please try again."`|שגיאה לא צפויה|

**שלבי עיבוד:**

1. אימות ונרמל דוא"ל (אותיות קטנות, חיתוך)
2. בדוק אם יש מנוי פעיל קיים באמצעות `getNewsletterSubscriptionByEmail`
3. צור רשומת מנוי עם מקור `"footer"` דרך `createNewsletterSubscription`
4. שלח דוא"ל קבלת פנים באמצעות ספק הדוא"ל המוגדר (שלח מחדש או Novu)

כשלי שליחת אימייל נתפסים בשקט ואינם מונעים מההרשמה להצליח.

**מקור:** `template/app/[locale]/newsletter/actions.ts`

### בטל את המנוי לניוזלטר

```typescript
unsubscribeFromNewsletter(data: { email: string })
```

מבטל את הרישום של דוא"ל מהניוזלטר על ידי הגדרת `isActive` ל-`false`. שולח הודעת אימייל לאישור ביטול הרשמה.

**תגובת הצלחה:**

```json
{
  "success": true
}
```

**תגובות שגיאה:**

|שגיאה|מצב|
|---|---|
|`"Email is not subscribed to the newsletter"`|לא נמצא מנוי פעיל|
|`"Failed to unsubscribe. Please try again."`|עדכון מסד הנתונים נכשל|

**מקור:** `template/app/[locale]/newsletter/actions.ts`

### קבל סטטיסטיקות ניוזלטר

```typescript
getNewsletterStatistics()
```

מחזירה סטטיסטיקות מצטברות של ניוזלטר. אין צורך בפרמטרי קלט.

**תגובת הצלחה:**

```json
{
  "success": true,
  "data": {
    "totalActive": 1250,
    "recentSubscriptions": 45
  }
}
```

|שדה|הקלד|תיאור|
|---|---|---|
|`totalActive`|מספר שלם|מספר המינויים הפעילים כעת|
|`recentSubscriptions`|מספר שלם|מנויים שנוצרו ב-30 הימים האחרונים|

מחזירה אפסים עבור שני השדות אם השאילתה נכשלת, מה שמבטיח השפלה חיננית.

**מקור:** `template/app/[locale]/newsletter/actions.ts`

## שאילתות מסד נתונים

נתוני ההרשמה לניוזלטר מנוהלים באמצעות פונקציות שאילתות ייעודיות ב-`lib/db/queries/newsletter.queries.ts`.

### פעולות מנוי

|פונקציה|תיאור|
|---|---|
|`createNewsletterSubscription(email, source)`|יוצר רשומת מנוי חדשה|
|`getNewsletterSubscriptionByEmail(email)`|מחפש מנוי באימייל|
|`updateNewsletterSubscription(email, updates)`|מעדכן שדות מנוי|
|`unsubscribeFromNewsletter(email)`|מגדיר `isActive: false` ומתעד `unsubscribedAt`|
|`resubscribeToNewsletter(email)`|מגדיר `isActive: true` ומנקה `unsubscribedAt`|
|`getNewsletterStats()`|מחזירה ספירה פעילה וספירת מנויים ל-30 יום|

כל חיפושי הדואר האלקטרוני מנרמלים את הקלט לאותיות קטנות וחותכים את הרווח הלבן לפני השאילתה.

**מקור:** `template/lib/db/queries/newsletter.queries.ts`

## תצורה

קבועי תצורת ניוזלטר מוגדרים ב-`lib/newsletter/config.ts`:

```
NEWSLETTER_CONFIG.DEFAULT_PROVIDER = "resend"
NEWSLETTER_CONFIG.DEFAULT_FROM = "onboarding@resend.dev"
NEWSLETTER_CONFIG.DEFAULT_COMPANY_NAME = "Ever Works"
```

### מקורות מנוי

|מקור|תיאור|
|---|---|
|`footer`|הרשמה מטופס הכותרת התחתונה של האתר|
|`popup`|מנוי מתיבת דו-שיח קופצת|
|`signup`|מנוי במהלך רישום המשתמש|

### סכימות אימות

שתי סכימות Zod מיוצאות לאימות:

- **`emailSchema`** -- מאמת ומנרמל שדה דוא"ל בודד
- **`newsletterSubscriptionSchema`** -- מאמת דוא"ל ומקור (ברירת המחדל היא `"footer"`)

### ספקי דוא"ל

המערכת תומכת בשני ספקי דוא"ל המוגדרים באמצעות `config.yml` ומשתני סביבה:

|ספק|משתנה סביבתי|תיאור|
|---|---|---|
|שלח שוב|`RESEND_API_KEY`|ספק דוא"ל ברירת מחדל|
|נובו|`NOVU_API_KEY`|ספק חלופי עם תמיכה בתבניות|

הספק נבחר על סמך השדה `mail.provider` ב-`config.yml`. תצורת דוא"ל נבנית באופן דינמי מתצורת האפליקציה באמצעות `createEmailConfig()`.

**מקור:** `template/lib/newsletter/config.ts`

## פרטי יישום מרכזיים

- **פעולות שרת:** אלו אינן נקודות קצה של REST API. הם משתמשים במעטפת `validatedAction` מ-`lib/auth/middleware` המספקת אימות סכימת Zod לפני ביצוע הפעולה.
- **נורמליזציה של דוא"ל:** כל הודעות האימייל מנורמלות לאותיות קטנות וחתומות הן ברמת הפעולה והן ברמת שאילתת מסד הנתונים לצורך חיפושים עקביים.
- **כישלונות דוא"ל חינניים:** דוא"ל אישור ברוכים הבאים וביטול הרשמה נשלחות באמצעות `sendEmailSafely()`, אשר תופס שגיאות בשקט. הודעת אימייל שנכשלה אינה מונעת את השלמת פעולת המנוי.
- **מניעת כפילויות:** לפני יצירת מנוי, המערכת בודקת מנוי פעיל קיים באמצעות `validateExistingSubscription()`.
- **ביטול הרשמה רכה:** ביטול הרשמה קובע `isActive: false` במקום למחוק את הרשומה, שומר על היסטוריית המנויים.
