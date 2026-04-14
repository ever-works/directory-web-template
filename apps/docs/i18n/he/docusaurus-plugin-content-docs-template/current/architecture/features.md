---
id: features
title: תכונות פלטפורמה
sidebar_label: תכונות
sidebar_position: 3
---

# תכונות פלטפורמה

מסמך זה מספק סקירה מקיפה של כל התכונות הזמינות בפלטפורמת Ever Works, מאורגנת לפי אזור פונקציונלי.

## אימות משתמשים וניהול חשבון

### רישום משתמש

**תיאור**: מאפשר למשתמשים חדשים ליצור חשבונות בפלטפורמה.

**איך זה עובד**:

- משתמשים יכולים להירשם באמצעות דואר אלקטרוני/סיסמה או ספקי OAuth (גוגל, GitHub, Facebook, Twitter)
- אימות דוא"ל נשלח עם ההרשמה
- הסיסמה עוברת גיבוב באמצעות bcrypt לפני האחסון
- לאחר רישום מוצלח, פרופיל לקוח נוצר באופן אוטומטי

**זרימת משתמש**:

1. המשתמש לוחץ על "הירשם" בדף הבית
2. בוחר שיטת רישום (אימייל או OAuth)
3. ממלא את המידע הנדרש (שם, אימייל, סיסמה)
4. מקבל אימייל אימות
5. לוחץ על קישור אימות כדי להפעיל את החשבון
6. מנותב מחדש ללוח המחוונים של הלקוח

**קבצי מפתח**: `/lib/auth/index.ts`, `/app/[locale]/auth/`

[למידע נוסף על הגדרת אימות →](/authentication/setup-guide)

---

### User Login

**Description**: Authenticates existing users to access their accounts.

**How it works**:

- Supports credential-based login (email/password)
- Supports OAuth login via multiple providers
- Creates JWT session token valid for 30 days
- Session refreshes automatically after 24 hours of activity
- Admins are redirected to admin portal; clients to client portal

**Security features**:

- Password hashing with bcrypt
- ReCAPTCHA integration for bot prevention
- Session invalidation on logout
- Automatic session expiration

**Key files**: `/lib/auth/index.ts`, `/app/[locale]/auth/signin/`

---

### ניהול סיסמאות

**תיאור**: מאפשר למשתמשים לשנות או לאפס את הסיסמאות שלהם.

**תכונות**:

- **שנה סיסמה**: משתמשים מאומתים יכולים לעדכן את הסיסמה שלהם מההגדרות
- **שכחת סיסמה**: משתמשים מקבלים אימייל עם קישור לאיפוס
- **איפוס אסימון**: אסימון מוגבל בזמן לאיפוס סיסמה מאובטחת

**איך זה עובד**:

1. משתמש מבקש איפוס סיסמה
2. המערכת מייצרת אסימון מאובטח המאוחסן בטבלה `passwordResetTokens`
3. אימייל נשלח עם קישור איפוס המכיל אסימון
4. המשתמש לוחץ על הקישור ומזין סיסמה חדשה
5. האסימון אינו חוקי לאחר השימוש

**קבצי מפתח**: `/app/api/auth/change-password/`, `/lib/db/schema.ts`

---

## Item Listing & Discovery

### Item Browsing

**Description**: The core feature allowing users to browse and discover items on the platform.

**How it works**:

- Items are loaded from Git-based CMS (`.content` folder)
- Supports pagination with configurable page sizes
- Two view modes: "classic" grid and "alternative" layout
- Real-time filtering without page reload

**Display options**:

- Grid layout with thumbnails
- List layout with descriptions
- Sorting by popularity, date, or name

**Key files**: `/app/[locale]/(listing)/listing.tsx`, `/components/globals-client.tsx`

---

### חיפוש וסינון

**תיאור**: מאפשר למשתמשים למצוא פריטים ספציפיים תוך שימוש בקריטריונים שונים.

**סוגי מסננים**:

- **חיפוש טקסט**: חיפוש טקסט מלא בין שמות ותיאורים של פריטים
- **מסנן קטגוריות**: סנן לפי קטגוריות בודדות או מרובות
- **מסנן תגים**: סינון לפי תגים שהוקצו לפריטים
- **מסננים משולבים**: החל מסננים מרובים בו זמנית

**איך זה עובד**:

1. מסננים מאוחסנים בפרמטרים של כתובת אתר לצורך שיתוף
2. `FilterProvider` ההקשר מנהל את מצב המסנן
3. `FilterURLParser` מסנכרן כתובת URL עם מצב מסנן
4. הפריטים מסוננים בצד השרת ומוחזרים ללקוח

**חווית משתמש**:

- מסננים נמשכים בכתובת האתר (ניתן לסמן/ניתן לשיתוף)
- עדכון תוצאות בזמן אמת
- נקה את אפשרות כל המסננים

**קבצי מפתח**: `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

---

### Category Navigation

**Description**: Hierarchical organization of items into categories.

**Features**:

- Nested category structure (parent/child)
- Category pages with item listings
- Category icons and descriptions
- Breadcrumb navigation

**How it works**:

- Categories stored in `.content/categories/` as markdown files
- Support for multi-level hierarchy
- Can be enabled/disabled via admin settings
- Reorderable via admin panel

**Key files**: `/app/[locale]/categories/`, `/lib/services/category-git.service.ts`

---

### מערכת תגים

**תיאור**: טקסונומיה שטוחה לארגון פריט חוצה קטגוריות.

**תכונות**:

- מספר תגים לכל פריט
- תצוגת ענן תגים
- סינון מבוסס תגים
- ניתן להפעיל/להשבית באמצעות הגדרות אדמין

**איך זה עובד**:

- תגים המאוחסנים ב-`.content/tags/` כקובצי סימון
- יחסים רבים לרבים עם פריטים
- תגים ניתנים ללחיצה מסננים רישום פריט

**קבצי מפתח**: `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

---

## Item Engagement Features

### Voting System

**Description**: Allows users to upvote or downvote items.

**How it works**:

1. User clicks vote button on item
2. System checks if user is authenticated
3. Checks for existing vote and updates or creates new vote
4. Vote count updates in real-time
5. Stores vote in `votes` table with timestamp

**Rules**:

- One vote per user per item
- Users can change vote direction
- Users can remove their vote
- Vote counts displayed on item cards

**Key files**: `/hooks/use-item-vote.ts`, `/app/api/items/[slug]/votes/`

---

### מערכת דירוג

**תיאור**: משתמשים יכולים לדרג פריטים בסולם של 1-5 כוכבים.

**איך זה עובד**:

- הדירוג הוא חלק ממערכת התגובות
- כל תגובה יכולה לכלול דירוג
- דירוג ממוצע מחושב ומוצג
- מוצגת התפלגות דירוג (כמה 5 כוכבים, 4 כוכבים וכו')

**תצוגה**:

- סמלי כוכבים המציגים דירוג ממוצע
- ספירת דירוג לצד כוכבים
- פירוט דירוג בדף פירוט הפריט

**קבצי מפתח**: `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (טבלת הערות)

---

### Comments System

**Description**: Users can leave comments and reviews on items.

**Features**:

- Text comments with optional rating
- Edit own comments
- Delete own comments
- Admin moderation capabilities
- Threaded replies (if enabled)

**How it works**:

1. User writes comment on item detail page
2. Optionally selects star rating (1-5)
3. Comment stored in `comments` table linked to user's client profile
4. Comments displayed in chronological or relevance order
5. Admin can delete inappropriate comments

**Moderation**:

- Admin can view all comments in admin panel
- Delete functionality for inappropriate content
- Report system triggers admin notification

**Key files**: `/hooks/use-comments.ts`, `/app/api/items/[slug]/comments/`

---

### מערכת מועדפים

**תיאור**: משתמשים יכולים לשמור פריטים ברשימת המועדפים שלהם לגישה מהירה.

**איך זה עובד**:

1. המשתמש לוחץ על הלב/סמל המועדף על הפריט
2. פריט נוסף לטבלה `favorites`
3. מועדפים נגישים מפרופיל המשתמש
4. החלף פעולה (לחץ שוב כדי להסיר)

**תכונות**:

- רשימת המועדפים בפורטל לקוחות
- פעולה לא מועדפת מהירה
- מועדפים נסמכים על פריטים (אופציונלי)
- ייצוא רשימת המועדפים

**קבצי מפתח**: `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

---

## Featured Items

**Description**: Admin-curated items displayed prominently on the homepage.

**How it works**:

1. Admin selects items to feature from admin panel
2. Sets display order for featured items
3. Featured items appear in dedicated section on homepage
4. Can set expiration date for featured status

**Features**:

- Manual ordering/ranking
- Separate from algorithmic popularity
- Highlighted display on homepage
- Configurable number of featured items

**Key files**: `/hooks/use-admin-featured-items.ts`, `/app/api/admin/featured-items/`

---

## הגשת פריט

**תיאור**: מאפשר למשתמשים לשלוח פריטים חדשים לפלטפורמה.

**איך זה עובד**:

1. המשתמש מנווט לדף הגשה
2. מילוי פרטי הפריט (שם, תיאור, כתובת אתר, לוגו)
3. בוחר קטגוריה ותגים
4. מגיש לבדיקה
5. מנהל המערכת מקבל הודעה על הגשה חדשה
6. מנהל סוקר ומאשר/דוחה
7. פריטים מאושרים מופיעים בפלטפורמה

**שדות טופס**:

- שם פריט (חובה)
- תיאור (חובה)
- כתובת האתר
- העלאת לוגו/תמונה
- בחירת קטגוריה
- בחירת תגים
- מטא נתונים נוספים

**מצבי זרימת עבודה**:

- טיוטה ← בהמתנה לבדיקה ← אושר/נדחה

**קבצי מפתח**: `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

---

## Survey System

**Description**: Create and manage surveys for collecting user feedback.

**Types**:

- **Global surveys**: Available to all users
- **Item-specific surveys**: Attached to specific items

**Question types** (via SurveyJS):

- Multiple choice
- Text input
- Rating scales
- Matrix questions
- File upload

**Features**:

- Survey preview before publishing
- Response analytics
- Export to CSV/Excel
- Anonymous or authenticated responses

**Key files**: `/lib/services/survey.service.ts`, `/app/api/surveys/`

[Learn more about surveys →](/guides/survey-system)

---

## מערכת מנויים ותשלומים

**תיאור**: מונטיזציה באמצעות גישה מבוססת מנוי או תכונות פרימיום.

**ספקים נתמכים**:

- **פס**: ניהול מנויים מלא, חשבוניות, פורטל לקוחות
- **LemonSqueezy**: מעבד תשלומים חלופי עם ציות למס

**איך זה עובד**:

1. תוכניות המוגדרות בספק התשלומים (Stripe/LemonSqueezy)
2. משתמשים בוחרים תוכנית בדף התמחור
3. מנותב מחדש לקופה של ספק התשלום
4. Webhook מטפל בתשלום מוצלח
5. רשומת מנוי נוצרה במסד נתונים
6. המשתמש מקבל גישה לתכונות פרימיום

**קבצי מפתח**: `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[למידע נוסף על שילוב תשלומים →](/payment)

---

## User Profile Management

**Description**: Users can manage their personal information and preferences.

**Basic Profile Information**:

- Name, email, avatar
- Bio and social links
- Notification preferences
- Privacy settings

**Features**:

- Profile editing
- Avatar upload
- Email change with verification
- Account deletion

**Key files**: `/app/[locale]/profile/`, `/app/api/profile/`

---

## מערכת הודעות

**תיאור**: התראות שנוצרו על ידי המערכת עבור אירועים חשובים.

**סוגי הודעות**:

- הערות חדשות על פריטים של המשתמש
- עדכוני מנוי
- הודעות מנהל
- אישור/פסילה של פריט

**ערוצי משלוח**:

- התראות בתוך האפליקציה
- הודעות דוא"ל (דרך שלח מחדש/נובו)
- הודעות דחיפה (אופציונלי)

**קבצי מפתח**: `/lib/services/notification.service.ts`, `/app/api/notifications/`

---

## Company Profiles

**Description**: Manage company entities associated with items.

**Features**:

- Company name, logo, description
- Link multiple items to a company
- Company detail pages
- Company directory

**Key files**: `/app/[locale]/companies/`, `/lib/services/company.service.ts`

---

## שילוב CRM (Twenty CRM)

**תיאור**: סנכרון נתוני פלטפורמה עם Twenty CRM לניהול קשרי לקוחות.

**תכונות**:

- יצירה אוטומטית של אנשי קשר מהרשמות משתמשים
- סנכרון פעילויות ואינטראקציות של משתמשים
- עקוב אחר מנויים ותשלומים
- מיפוי שדות מותאם אישית
- סנכרון מבוסס Webhook

**קבצי מפתח**: `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

---

## Analytics & Reporting

**Description**: Track platform usage and generate reports.

**Analytics providers**:

- **PostHog**: Product analytics, feature flags, session recording
- **Sentry**: Error tracking, performance monitoring
- **Vercel Analytics**: Core Web Vitals

**Tracked events**:

- Page views
- Item interactions (views, votes, favorites)
- User registrations and logins
- Subscription events
- Error occurrences

**Key files**: `/lib/analytics/`, `/lib/error-tracking/`

---

## בינלאומי (i18n)

**תיאור**: תמיכה בריבוי שפות בפלטפורמה.

**שפות נתמכות**: 13+ שפות כולל אנגלית, צרפתית, ספרדית, סינית, גרמנית, ערבית (RTL) ועוד.

**תכונות**:

- זיהוי מקומי אוטומטי
- החלפת אזורים מבוססי URL
- תמיכת RTL בערבית
- עיצוב תאריך/מספר לכל מקום
- כללי ריבוי

**קבצי מפתח**: `/messages/`, `/lib/i18n/`, `/middleware.ts`

[למידע נוסף על בינלאומיזציה →](/אינטרנציונליזציה)

---

## Content Management

**Description**: Git-based CMS for managing items, categories, and tags.

**How it works**:

- Content stored in `.content` folder
- Synced from external Git repository
- Markdown files with frontmatter
- Version control via Git
- Collaborative editing

**Content types**:

- Items (`.content/items/`)
- Categories (`.content/categories/`)
- Tags (`.content/tags/`)
- Pages (`.content/pages/`)

**Key files**: `/lib/services/*-git.service.ts`, `/lib/git/`

---

## לוח המחוונים לניהול

**תיאור**: מרכז מרכזי למנהלי מערכת לניטור וניהול הפלטפורמה.

**ווידג'טים של לוח המחוונים**:

- סה"כ משתמשים, פריטים, מנויים
- הזנת פעילות אחרונה
- הגשות ממתינות
- מצב בריאות המערכת
- סקירה כללית של אנליטיקה

**תכונות עיקריות**:

- סטטיסטיקה בזמן אמת
- פעולות מהירות
- הודעות מערכת
- מדדי ביצועים

**קבצי מפתח**: `/app/[locale]/admin/dashboard/`

---

## User & Role Management

**Description**: Admin management of user accounts and permissions.

**User Management**:

- View all users
- Edit user profiles
- Suspend/activate accounts
- Reset passwords
- View user activity

**Role Management**:

- Admin role (full access)
- Client role (standard user)
- Custom roles (extensible)

**Key files**: `/app/[locale]/admin/users/`, `/lib/auth/roles.ts`

---

## ניהול לקוחות

**תיאור**: ניהול אדמין של פרופילי לקוחות.

**תכונות**:

- הצג את כל פרופילי הלקוחות
- ערוך את פרטי הלקוח
- קישור לקוחות לחברות
- צפה בהגשות של לקוחות
- ניהול מנויי לקוחות

**קבצי מפתח**: `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

---

## Content Moderation

**Description**: Admin tools for reviewing and moderating user-generated content.

**Item Review**:

- Approve/reject submitted items
- Edit item details
- Feature/unfeature items
- Delete items

**Comment Moderation**:

- View all comments
- Delete inappropriate comments
- Ban users for violations

**Key files**: `/app/[locale]/admin/moderation/`, `/app/api/admin/items/[id]/review/`

---

## ניהול הגדרות

**תיאור**: אפשרויות תצורה בפלטפורמה.

**קטגוריות הגדרות**:

- **כללי**: שם האתר, תיאור, לוגו
- **תכונות**: הפעל/השבת תכונות (קטגוריות, תגים, הצבעה וכו')
- **דוא"ל**: תצורת SMTP, תבניות דוא"ל
- **תשלום**: מפתחות API של Stripe/LemonSqueezy
- **אנליטיקה**: תצורת PostHog, Sentry
- **אבטחה**: ReCAPTCHA, הגבלת שיעור

**קבצי מפתח**: `/app/[locale]/admin/settings/`, `/lib/config/`

---

## Data Export

**Description**: Export platform data for analysis or backup.

**Export formats**:

- CSV
- JSON
- Excel

**Exportable data**:

- Users
- Items
- Comments
- Subscriptions
- Survey responses

**Key files**: `/app/api/admin/export/`

---

## תכונות נוספות

### תבניות דואר אלקטרוני

תבניות דוא"ל הניתנות להתאמה אישית עבור:

- אימיילים ברוכים הבאים
- איפוס סיסמה
- אימות דוא"ל
- אישורי מנוי
- ניוזלטר

[למידע נוסף על תבניות אימייל →](/guides/email-templates)

### מערכת נושאים

ערכות נושא מרובות שנבנו מראש:

- EverWorks (ברירת מחדל)
- תאגידי
- חומר
- מצחיק

[למידע נוסף על נושאים →](/guides/theming)

### מערכת צבע דינמית

יצירת לוח צבעים אוטומטית (גוונים 50-950) מצבעי בסיס.

[למידע נוסף על צבעים דינמיים →](/guides/dynamic-colors)

### בדיקות רספונסיביות

הנחיות ושיטות עבודה מומלצות לבדיקות חוצות-מכשירים.

[למידע נוסף על בדיקות →](/פיתוח/בדיקה)

---

## Feature Summary

| Category | Features |
|----------|----------|
| **Authentication** | Registration, Login, OAuth, Password Reset |
| **Discovery** | Browsing, Search, Filtering, Categories, Tags |
| **Engagement** | Voting, Rating, Comments, Favorites |
| **Submission** | User submissions, Admin review, Approval workflow |
| **Monetization** | Stripe, LemonSqueezy, Subscriptions |
| **User Management** | Profiles, Notifications, Preferences |
| **Admin Tools** | Dashboard, Moderation, Settings, Export |
| **Integrations** | CRM, Analytics, Email, Surveys |
| **Customization** | Themes, Colors, i18n, Email templates |

---

## השלבים הבאים

- [Tech Stack](./tech-stack) - חקור את ערימת הטכנולוגיה
- [סקירה כללית של אדריכלות](./overview) - הבן את הארכיטקטורה

## משאבים

- [הגדרת פיתוח](/development/local-setup) - הגדר את הסביבה שלך
- [מדריך פריסה](/פריסה/סקירה כללית) - פריסה לייצור
- [תיעוד API](/development/api-documentation) - התייחסות ל-API
