---
id: item-submissions
title: הגשת פריטים
sidebar_label: הגשת פריטים
sidebar_position: 31
---

# הגשת פריטים

מערכת הגשת הפריטים מספקת זרימת עבודה מלאה למשתמשים להגשה, ניהול ומעקב אחר רשימות ספריות. זה כולל מעקב אחר סטטוס (בהמתנה, אושר, נדחה), סינון, כרטיסי סטטיסטיקה, שיטות פירוט, עריכה ומחיקה עם אישור.

## סקירה כללית של אדריכלות

| מודול | נתיב | מטרה |
|--------|------|--------|
| רשימת הגשה | `components/submissions/submission-list.tsx` | רכיב רשימה ראשי עם עימוד |
| SubmissionItem | `components/submissions/submission-item.tsx` | כרטיס הגשה אישי |
| מסנני הגשה | `components/submissions/submission-filters.tsx` | לשוניות סטטוס וחיפוש |
| SubmissionStatsCards | `components/submissions/submission-stats-cards.tsx` | סקירה כללית של כרטיסי סטטיסטיקה |
| EditSubmissionModal | `components/submissions/edit-submission-modal.tsx` | מודאלי עריכה מוטבעת |
| SubmissionDetailModal | `components/submissions/submission-detail-modal.tsx` | תצוגת פירוט לקריאה בלבד |
| DeleteSubmissionDialog | `components/submissions/delete-submission-dialog.tsx` | אישור מחיקה |
| TrashItem | `components/submissions/trash-item.tsx` | תצוגת פריט אשפה |
| משמר תוכנית | `lib/guards/plan-features.guard.ts` | מגבלות הגשה לפי תוכנית |

## מודל נתוני הגשה

ממשק `Submission` מייצג הגשה בממשק המשתמש:

```ts
export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  source_url?: string;
}
```

העוזר `toSubmission` ממיר ממודל הנתונים של ה-API:

```ts
export function toSubmission(
  item: ClientSubmissionData
): Submission {
  const approvedAt =
    item.status === 'approved' ? item.reviewed_at : undefined;
  const rejectedAt =
    item.status === 'rejected' ? item.reviewed_at : undefined;

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    status: (['approved', 'pending', 'rejected'].includes(
      item.status
    )
      ? item.status
      : 'pending') as Submission['status'],
    submittedAt: item.submitted_at || item.updated_at || null,
    approvedAt,
    rejectedAt,
    rejectionReason: item.review_notes,
    category: Array.isArray(item.category)
      ? item.category[0] || 'Uncategorized'
      : item.category || 'Uncategorized',
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    source_url: item.source_url,
  };
}
```

## רכיב רשימת הגשה

הרכיב `SubmissionList` מציג את רשימת ההגשות עם מצבי טעינה, ריקים ומאוכלסים:

```tsx
export interface SubmissionListProps {
  items: ClientSubmissionData[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  emptyStateActionHref?: string;
  skeletonCount?: number;
}
```

התנהגויות מפתח:

- **מצב טעינה** -- מציג `SubmissionItemSkeleton` מצייני מיקום
- **מצב ריק** -- מציג קריאה לפעולה המקשרת אל `/submit` - **מצב מאוכלס** - ממפה פריטים דרך `toSubmission()` ומציג `SubmissionItem` עבור כל אחד מהם
- **מחווני טעינה אופטימיים** -- `deletingId` ו `updatingId` משביתים פריטים מושפעים

הגרסה `SubmissionListWithInfo` מוסיפה תצוגת מטא נתונים של עימוד.

## תצורת סטטוס

כל סטטוס הגשה ממפה לסמל, ערכת צבעים ומפתח תרגום:

```ts
const statusConfig = {
  approved: {
    labelKey: "STATUS_APPROVED",
    icon: FiCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pending: {
    labelKey: "STATUS_PENDING",
    icon: FiClock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  rejected: {
    labelKey: "STATUS_REJECTED",
    icon: FiX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};
```

הגשות שנדחו מציגות את סיבת הדחייה בתיבת הסבר אדומה.

## מסנני הגשה

הרכיב `SubmissionFilters` מספק סינון סטטוס בסגנון כרטיסיות וחיפוש טקסט:

```tsx
export interface SubmissionFiltersProps {
  status: ClientStatusFilter;
  search: string;
  onStatusChange: (status: ClientStatusFilter) => void;
  onSearchChange: (search: string) => void;
  isSearching?: boolean;
  disabled?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}
```

תכונות:

- **כרטיסיות סטטוס** - לחצני גלולה עבור הכל, מאושר, בהמתנה ונדחה עם תגי ספירה אופציונליים
- **קלט חיפוש** -- חיפוש טקסט מלא עם כפתור נקי וספינר טעינה
- **גרסה קומפקטית** -- `SubmissionFiltersCompact` משתמש בתפריט נפתח עבור פריסות מוגבלות מקום

## כרטיסי סטטיסטיקה

הרכיב `SubmissionStatsCards` מציג ארבעה כרטיסים סטטיסטיים ברשת:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

ארבעת הקלפים מראים:

| כרטיס | מפתח | צבע |
|------|-----|-------|
| סך כל הגשות | `total` | כחול |
| אושר | `approved` | ירוק |
| בהמתנה | `pending` | צהוב |
| נדחה | `rejected` | אדום |

לכל כרטיס יש רקע של סמל שיפוע, שלד טעינה מונפש ואפקט צל ריחוף.

## כרטיס פריט הגשה

כל `SubmissionItem` מציג:

- כותרת עם תג סטטוס
- תיאור קטום (מהדק דו-קוים)
- עד 5 תגים עם ספירת הצפה
- שורת מטא נתונים: קטגוריה, תאריך הגשה, ספירת צפיות, ספירת לייקים
- לחצני פעולה: הצג, ערוך, מחק
- טעינת ספינרים על כפתורי עריכה/מחיקה כאשר הפעולות מתבצעות
- מצב מושבת במהלך פעולות בכמות גדולה

## מגבלות הגשה על בסיס תוכנית

מערכת משמר התוכנית שולטת בכמה הגשות משתמש יכול לבצע:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

כדי לבדוק מגבלות לפני ההגשה:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

תכונות נוספות המוגדרות בתוכנית להגשות:

| תכונה | חינם | סטנדרטי | פרימיום |
|--------|------|--------|--------|
| שלח פריטים | כן | כן | כן |
| מקסימום תמונות | 1 | 5 | ללא הגבלה |
| מילות תיאור | 200 | 500 | ללא הגבלה |
| העלאת וידאו | לא | לא | כן |
| תג מאומת | לא | כן | כן |
| סקירת עדיפות | לא | כן | כן |
| סקירה מיידית | לא | לא | כן |
| זמן סקירה (ימים) | 7 | 3 | 1 |

## זרימת עבודה להגשה

1. **המשתמש שולח** -- ממלא את טופס ההגשה הרב-שלבי
2. **אימות** - מגבלות תוכנית ואימות קלט נבדקים
3. **אחסון** -- נתוני הפריטים מאוחסנים ב-CMS מבוסס Git דרך שירות הפריטים
4. **סטטוס: בהמתנה** - ההגשה נכנסת לתור בדיקת המנהל
5. **ביקורת מנהל מערכת** -- מנהל מערכת מאשר או דוחה עם הערות אופציונליות
6. **סטטוס: אושר/נדחה** -- המשתמש רואה סטטוס מעודכן במרכז השליטה שלו
7. **עריכה** -- משתמשים יכולים לערוך הגשות (במגבלות השינוי בתוכנית)
8. **מחק** -- משתמשים יכולים למחוק את ההגשות שלהם עם תיבת אישור

## בינלאומי

כל טקסט ממשק המשתמש משתמש בתרגומי `next-intl` תחת מרחב השמות `client.submissions` :

- `NO_SUBMISSIONS_TITLE` -- כותרת מצב ריקה
- `NO_SUBMISSIONS_DESC` -- תיאור מצב ריק
- `SUBMIT_FIRST_PROJECT` -- לחצן קריאה לפעולה
- `STATUS_APPROVED` , `STATUS_PENDING` , `STATUS_REJECTED` -- תוויות סטטוס
- `SUBMITTED` -- קידומת תאריך
- `VIEWS_COUNT` , `LIKES_COUNT` -- תוויות מטריות עם פרמטר ספירה
- `REJECTION_REASON` -- תווית הסבר לדחייה
- `SEARCH_PLACEHOLDER` -- חיפוש מציין מיקום קלט
- `SHOWING_RESULTS` , `PAGE_INFO` -- טקסט עימוד

## תיעוד קשור

- [טופסי ריבוי שלבים](/docs/template/features/multi-step-forms) -- יישום טופס הגשה
- [ניהול אדמין](/docs/template/features/admin-management) -- זרימת עבודה של סקירת מנהל מערכת
- [הצבעות והערות](/docs/template/features/voting-comments) -- מעורבות בהגשות
