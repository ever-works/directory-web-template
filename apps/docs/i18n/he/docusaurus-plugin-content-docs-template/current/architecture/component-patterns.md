---
id: component-patterns
title: ארכיטקטורה ודפוסים של רכיבים
sidebar_label: דפוסי רכיבים
sidebar_position: 7
---

# ארכיטקטורה ודפוסים של רכיבים

תבנית Ever Works מארגנת את רכיבי ה-React שלה באמצעות מבנה ספריות מבוסס תכונה, עם הפרדה ברורה בין רכיבי תכונה, רכיבים משותפים ופרימיטיבים של ממשק משתמש בסיסי.

## ארגון ספריות

הספרייה `components/` עוקבת אחר ארגון תכונה ראשון שבו לכל תחום מרכזי יש ספריית משנה משלו, לצד רכיבים משותפים ורכיבים ברמת ממשק המשתמש.

```
components/
├── admin/              # Admin panel feature components
├── auth/               # Authentication feature components
├── billing/            # Billing and payment components
├── collections/        # Collection display components
├── context/            # React context providers
├── dashboard/          # Dashboard feature components
├── directory/          # Directory listing components
├── favorites/          # Favorites feature components
├── featured-items/     # Featured items display
├── filters/            # Search and filter components
├── footer/             # Footer components
├── header/             # Header and navigation
├── home-two/           # Alternate homepage layout
├── icons/              # Custom icon components
├── item-detail/        # Item detail page components
├── layout/             # Layout wrapper components
├── layouts/            # Layout variant components
├── maps/               # Map integration components
├── newsletter/         # Newsletter components
├── payment/            # Payment flow components
├── pricing/            # Pricing display components
├── profile/            # User profile components
├── profile-button/     # Profile button dropdown
├── providers/          # Provider wrapper components
├── settings/           # Settings panel components
├── shared/             # Shared reusable components
├── shared-card/        # Shared card components
├── sponsor-ads/        # Sponsor ad components
├── sponsorships/       # Sponsorship management components
├── submissions/        # Submission form components
├── submit/             # Item submit components
├── surveys/            # Survey components
├── tracking/           # Analytics tracking components
├── ui/                 # Base UI primitives
└── version/            # Version display components
```

## רכיבים מבוססי תכונות

כל ספריית תכונות מכילה את כל הרכיבים הקשורים לאותו תחום. זה שומר על מיקום משותף של קוד קשור ומקל על מציאת רכיבים עבור תכונה נתונה.

### מנהל/

מכיל את כל רכיבי פאנל הניהול כולל טבלאות נתונים, טפסים, מודלים וממשקי ניהול. אלו הם רכיבי לקוח המשתמשים ב-hooks ספציפיים למנהל מ-`hooks/use-admin-*.ts`.

### אישור/

רכיבי אימות כולל טפסי כניסה, טפסי הרשמה, זרימות איפוס סיסמה, לחצני OAuth ומסכי אימות דוא"ל.

### חיוב/

רכיבי חיוב וניהול מנויים כולל בחירת תוכנית, טפסי אמצעי תשלום, תצוגת חשבוניות ומחווני סטטוס מנוי.

### מסננים/

רכיבי חיפוש וסינון המשמשים בדפי הרישום. אלה מקיימים אינטראקציה עם פרמטרי חיפוש כתובות אתרים ומצב סינון Zustand כדי לספק סינון בזמן אמת.

### תמחור/

רכיבי עמוד תמחור כולל כרטיסי השוואת תוכניות, מטריצות תכונות ושילוב קופה.

## רכיבים משותפים

### משותף/

הספרייה `shared/` מכילה רכיבים הניתנים לשימוש חוזר המשמשים בתכונות מרובות. אלו הם אבני בניין אגנוסטיות לתחום המשלבות פרימיטיבים של ממשק משתמש לתבניות פונקציונליות.

### כרטיס משותף/

רכיבי כרטיסים משותפים המשמשים להצגת פריטים, אוספים ותוכן אחר בפריסות כרטיסים ברחבי האפליקציה.

## רכיבים ברמת השורש

קיימים מספר קבצי רכיבים עצמאיים בשורש של `components/`:

|רכיב|מטרה|
|-----------|---------|
|`categories-grid.tsx`|תצוגת רשת עבור קטגוריות|
|`custom-hero.tsx`|מדור גיבורים הניתן להתאמה אישית|
|`error-boundary.tsx`|גבול שגיאה עם ממשק משתמש חוזר|
|`error-provider.tsx`|ספק הקשר שגיאה|
|`favorite-button.tsx`|לחצן החלפה מועדף|
|`hero.tsx`|קטע גיבור ברירת מחדל|
|`item.tsx`|רכיב כרטיס פריט|
|`items-categories.tsx`|פריטים מאורגנים לפי קטגוריות|
|`item-skeleton.tsx`|טעינת שלד לפריטים|
|`item-tags.tsx`|תצוגת תגים לפריטים|
|`language-switcher.tsx`|רכיב החלפת מיקום|
|`layout-switcher.tsx`|החלפת פריסת רשת/רשימה|
|`report-button.tsx`|כפתור דיווח תוכן|
|`sort-menu.tsx`|אפשרויות מיון נפתחות|
|`tags-cards.tsx`|תצוגת כרטיס תג|
|`tags-items.tsx`|תצוגת פריטים לפי תג|
|`theme-toggler.tsx`|החלפת נושא בהיר/כהה|
|`universal-pagination.tsx`|רכיב עימוד לשימוש חוזר|
|`view-toggle.tsx`|החלפת מצב תצוגה|

## פרימיטיבים של ממשק משתמש (רכיבים/UI/)

הספרייה `ui/` מכילה רכיבי ממשק משתמש ברמת הבסיס המספקים את הבסיס למערכת העיצוב. אלה בנויים על גבי HeroUI (לשעבר NextUI) ו- Tailwind CSS.

הפרימיטיבים העיקריים של ממשק המשתמש כוללים:

|רכיב|תיאור|
|-----------|-------------|
|`button.tsx`|לחצן עם גרסאות (ראשי, משני, רוח רפאים וכו')|
|`card.tsx`|מיכל כרטיסים עם חלקי כותרת עליונה, גוף, כותרת תחתונה|
|`input.tsx`|קלט טקסט עם תמיכה באימות|
|`label.tsx`|רכיב תווית טופס|
|`modal.tsx`|דו-שיח מודאלי עם שכבת-על|
|`select.tsx`|בחר בתפריט נפתח עם יכולת חיפוש|
|`pagination.tsx`|רכיב ניווט בדף|
|`badge.tsx`|רכיב תג סטטוס|
|`accordion.tsx`|קטעי תוכן הניתנים להרחבה|
|`alert.tsx`|באנר התראה/התראה|
|`breadcrumb.tsx`|ניווט בפירורי לחם|
|`loading-spinner.tsx`|מחוון טעינה|
|`password-strength.tsx`|מד חוזק סיסמא|
|`rating.tsx`|תצוגת/קלט דירוג כוכבים|
|`infinity-scroll.tsx`|עטיפה אינסופית של גלילה|
|`searchable-select.tsx`|בחר עם סינון חיפוש|
|`animations.tsx`|רכיבי עזר אנימציה|
|`auth-illustrations.tsx`|איורי דפי אישור|

## שרת מול רכיבי לקוח

התבנית עוקבת אחר מוסכמות Next.js להפרדת רכיבי שרת ולקוח:

### רכיבי שרת

רכיבי שרת הם ברירת המחדל בנתב האפליקציות. הם משמשים עבור:
- פריסות עמודים ועטיפות
- איסוף נתונים ברמת הדף
- עיבוד תוכן סטטי
- תוכן קריטי לקידום אתרים

רכיבי שרת חיים בעיקר בקובצי העמוד והפריסה `app/[locale]/`. הם יכולים לייבא ישירות פונקציות שאילתת מסד נתונים ושיטות מאגר.

### רכיבי לקוח

רכיבי לקוח מסומנים ב-`'use client'` ומשמשים עבור:
- רכיבי ממשק משתמש אינטראקטיביים (טפסים, לחצנים, בוררים)
- רכיבים המשתמשים ב-react hooks (useState, useEffect, ווים מותאמים אישית)
- רכיבים המשתמשים בממשקי API של דפדפן
- רכיבים התלויים ב-React Query או Zustand

רוב הרכיבים בספריית `components/` הם רכיבי לקוח מכיוון שהם מטפלים באינטראקציה של המשתמש ובמצב.

## ספקי הקשר

### רכיבים/הקשר/

ספקי הקשר של תגובה לשיתוף מצב בין עצי הרכיבים:
- הקשר שגיאה עבור מצב גבול שגיאה
- הקשר דגל תכונה עבור שער תכונות בזמן ריצה

### רכיבים/ספקים/

רכיבי מעטפת ספקים המרכיבים מספר ספקים:
- ספק לקוח שאילתה (TanStack Query)
- ספק נושא
- ספק הפעלה (NextAuth)
- ספק טוסט

מעטפת ספקי השורש בכתובת `app/[locale]/providers.tsx` מרכיבה את כל הספקים הדרושים לאפליקציה.

## אמנות רכיבים

1. **שמות קבצים**: רכיבים משתמשים בשמות קבצים של קבב (לדוגמה, `favorite-button.tsx`)
2. **דפוס ייצוא**: רכיבים משתמשים בייצוא עם שם, קבצי חבית (`index.ts`) בספריות תכונות
3. **מיקום משותף של Hooks**: Hooks ספציפיים לתכונה חיים בספריית ה-`hooks/` ברמה העליונה, לא בתוך ספריות רכיבים
4. **סטיילינג**: רכיבים משתמשים במחלקות שירות של Tailwind CSS; חלקם משתמשים במודולי SCSS לעיצוב מורכב
5. **סוגים**: סוגי אביזרי רכיב מוגדרים בשורה או בקבצי סוג סמוכים בתוך הספרייה `types/`
6. **סמלים**: סמלים מותאמים אישית מרוכזים ב-`components/icons/`; אייקונים סטנדרטיים משתמשים ב-`lucide-react`
