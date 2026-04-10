---
id: onboarding
title: מדריך הכנסה לעבודה
sidebar_label: הכנסה לעבודה
sidebar_position: 2
---

# מדריך הכנסה לעבודה

ברוך הבא ל-Ever Works! מדריך זה יעזור לך להגדיר את סביבת הפיתוח ולתרום את תרומתך הראשונה.

## 🎯 מטרות

לאחר השלמת מודול זה:

- ✅ תהיה לך סביבת פיתוח מוגדרת במלואה
- ✅ תבין את מבנה הפרויקט
- ✅ תוכל להריץ את האפליקציה מקומית
- ✅ תבצע את שינוי הקוד הראשון שלך
- ✅ תבין את תהליך עבודה הפיתוחי

**זמן משוער**: 1–2 ימים

---

## שלב 1: הגדרת סביבה

### 1.1 התקן כלים נדרשים

עקוב אחר [מדריך ההתקנה](/getting-started/installation) המפורט כדי להתקין:

- Node.js 20.19.0+
- pnpm ([התקנה](https://pnpm.io/installation))
- PostgreSQL 14+
- Git
- VS Code (מומלץ)

### 1.2 שכפל את המאגר

```bash
git clone https://github.com/ever-co/ever-works.git
cd ever-works
pnpm install
```

### 1.3 הגדר משתני סביבה

**רשימת בדיקה מהירה**:

- [ ] חיבור מסד נתונים מוגדר
- [ ] סודות אימות מוגדרים
- [ ] מפתחות ספק תשלום הוספו (אופציונלי לפיתוח)

---

## שלב 2: הגדרת מסד נתונים

### 2.1 הפעל PostgreSQL

```bash
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14
```

### 2.2 הרץ migrations

```bash
cd apps/web
pnpm exec drizzle-kit push
pnpm run db:seed
```

---

## שלב 3: הפעל שרת פיתוח

```bash
pnpm run dev
```

אמת בדפדפן:

- [ ] דף הבית נטען ב-`http://localhost:3000`
- [ ] ניתן ליצור חשבון
- [ ] ניתן להתחבר/להתנתק
- [ ] תיעוד API נגיש ב-`http://localhost:3000/api/reference`

---

## שלב 4: הבן את מבנה הפרויקט

```
directory-web-template/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   └── messages/
│   └── web-e2e/
├── packages/
└── turbo.json
```

---

## שלב 5: תהליך עבודה פיתוחי

### 5.1 צור ענף תכונה

```bash
git checkout main
git pull origin main
git checkout -b feature/שם-תכונה
```

### 5.2 Commit ו-Push

```bash
git add .
git commit -m "feat: הוספת מערכת התראות למשתמש"
git push origin feature/שם-תכונה
```

---

## ✅ רשימת בדיקה לאינדוקציה

- [ ] סביבת פיתוח מוגדרת במלואה
- [ ] האפליקציה רצה מקומית
- [ ] מסד הנתונים מחובר ומאוכלס
- [ ] מבנה הפרויקט מובן
- [ ] ענף ראשון נוצר
- [ ] Commit ראשון בוצע

---

## הצעדים הבאים

1. [תיעוד API](/team-training/api-documentation) – למד את מערכת התיעוד
2. [שיטות עבודה מומלצות](/team-training/best-practices) – למד תקני קוד
3. [תרגולים](/team-training/exercises) – התאמן עם משימות אמיתיות

צריך עזרה? שאל את המנטור שלך או בדוק את ערוץ Slack של הצוות! 🚀
