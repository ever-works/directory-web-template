---
id: cron-verification
title: אימות Cron ב-Vercel
sidebar_label: אימות Cron
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – רשימת בדיקות לאימות

## 🎯 תשובות מהירות

### שאלה 1: האם אפשר להריץ על Vercel בלי Trigger.dev?
**✅ כן** – המערכת מוגדרת כראוי לשימוש ב-Vercel Crons כאשר:
- `VERCEL=1` (מוגדר אוטומטית על ידי Vercel)
- משתני סביבה של Trigger.dev **לא** מוגדרים

### שאלה 2: כיצד אאמת שהכל עובד?
**✅ עקוב אחר 4 השלבים הבאים**

---

## 📊 מצב ההגדרה הנוכחי

### ✅ מה תוקן

| רכיב | מצב | פרטים |
|------|-----|-------|
| `vercel.json` | ✅ **תוקן** | כעת מכיל **3 משימות cron** מלאות (לפני כן היה לו 1 בלבד) |
| `initialize-jobs.ts` | ✅ **תוקן** | כעת רושם **3 משימות** מלאות (לפני כן רשם 2 בלבד) |
| נקודות קצה API | ✅ **מוכן** | כל 3 נקודות הקצה קיימות ועובדות |
| תיעוד | ✅ **נוצר** | מדריך חדש `CRON_JOBS.md` |

### 📋 רשימת משימות Cron המלאה

| # | שם משימה | נקודת קצה | לוח זמנים | מטרה |
|---|--------|-----------|-----------|------|
| 1 | סנכרון מאגר | `/api/cron/sync` | `*/5 * * * *` | סנכרון תוכן כל 5 דקות |
| 2 | תזכורות מנוי | `/api/cron/subscription-reminders` | `0 9 * * *` | שליחת תזכורות יומית בשעה 9:00 |
| 3 | תפוגת מנוי | `/api/cron/subscription-expiration` | `0 0 * * *` | טיפול במנויים שפגו בחצות |

---

## 🔍 4 שלבי אימות

### שלב 1: בדוק את לוח הבקרה של Vercel – Cron Jobs

**תבנית URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**מה לבדוק:**
- [ ] מוצגות **3 משימות cron** (לא רק 1)
- [ ] לכל משימה יש לוח זמנים נכון
- [ ] כולן מוצגות כ-"פעיל"

**תוצאה צפויה:**

| נתיב | לוח זמנים | מצב |
|------|-----------|-----|
| `/api/cron/sync` | כל 5 דקות | ✅ פעיל |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ פעיל |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ פעיל |

---

### שלב 2: בדוק יומני Vercel

**תבנית URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**בדוק כל נקודת קצה:**

#### א. יומני סנכרון
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] יומנים מופיעים כל 5 דקות
- [ ] קוד סטטוס 200 (הצלחה)
- [ ] אין שגיאות 401 (אימות)
- [ ] אין שגיאות 500 (כישלון)

#### ב. יומני תזכורות
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] יומנים מופיעים יומית בשעה 9:00
- [ ] קוד סטטוס 200 או 207 (הצלחה/הצלחה חלקית)

#### ג. יומני תפוגה
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] יומנים מופיעים יומית בחצות
- [ ] קוד סטטוס 200 (הצלחה)

---

### שלב 3: בדוק יומני אפליקציה

#### בעת הפעלת האפליקציה
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ זה מאשר:** זיהוי המערכת של סביבת Vercel

#### בכל סנכרון (כל 5 דקות)
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### בתזכורות מנוי (יומית בשעה 9:00)
```
[Cron] Subscription reminders job completed
```

#### בתפוגת מנויים (יומית בחצות)
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### שלב 4: בדוק משתני סביבה

**נדרשים:**
```bash
CRON_SECRET=<הוגדר ב-Vercel>
```

**לא צריכים להיות מוגדרים (לשימוש ב-Vercel במקום Trigger.dev):**
```bash
TRIGGER_SECRET_KEY=<צריך להיות ריק>
TRIGGER_API_KEY=<צריך להיות ריק>
TRIGGER_API_URL=<צריך להיות ריק>
```

**בדיקה דרך Vercel CLI:**
```bash
vercel env ls
```

---

## 🚨 בעיות נפוצות ופתרונות

### בעיה 1: מוצגת רק משימת cron אחת ב-Vercel

**סיבה:** נפרס `vercel.json` ישן  
**פתרון:**
1. ✅ `vercel.json` תוקן (3 משימות cron)
2. פרוס מחדש ל-Vercel: `git push` או `vercel --prod`
3. המתן 1-2 דקות כדי ש-Vercel ירשום את המשימות החדשות

---

### בעיה 2: שגיאת 401 Unauthorized

**סיבה:** `CRON_SECRET` לא מוגדר או לא תואם  
**פתרון:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

---

### בעיה 3: משימות לא רצות בכלל

**סיבה:** נעשה שימוש במצב Trigger.dev במקום Vercel

**בדיקה:**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
