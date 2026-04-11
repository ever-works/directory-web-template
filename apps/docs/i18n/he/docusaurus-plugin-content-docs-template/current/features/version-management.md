---
id: version-management
title: ניהול גרסאות
sidebar_label: ניהול גרסאות
sidebar_position: 15
---

# ניהול גרסאות

תבנית Ever Works כוללת מערכת ניהול גרסאות העוקבת אחר גרסת מאגר הנתונים, מציגה מידע גרסאות למנהלי מערכת ומספקת זיהוי אוטומטי של סנכרון. מערכת זו עוקבת אחר מאגר התוכן CMS מבוסס Git ומציגה פרטי גרסה באמצעות רכיבי ממשק משתמש ניתנים להגדרה.

## סקירה כללית של אדריכלות

| רכיב | נתיב | מטרה |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | React Query Hook לאחזור נתוני גרסה מה-API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | וו כלי עזר לניהול מטמון |
| `VersionDisplay` | `components/version/version-display.tsx` | רכיב תצוגת גרסה הניתן להגדרה |
| `VersionTooltip` | `components/version/version-tooltip.tsx` | רחף הסבר כלי המציג מידע מפורט על הגרסה |
| `/api/version` | `app/api/version/route.ts` | נקודת קצה API מחזירה נתוני גרסה נוכחית |

## מבנה נתונים של פרטי גרסה

מערכת הגרסה עוקבת אחר הנתונים הבאים ממאגר התוכן:

| שדה | הקלד | תיאור |
|---|---|---|
| `commit` | `string` | Hash קצר commit של גרסת הנתונים הנוכחית |
| `date` | `string` | מחרוזת תאריך ISO של ה-commit |
| `author` | `string` | שם מחבר |
| `message` | `string` | Commit message |
| `repository` | `string` | כתובת האתר של המאגר |
| `lastSync` | `string` | חותמת זמן של סנכרון הנתונים האחרון |

## הקרס `useVersionInfo` ### ממשק

```tsx
interface UseVersionInfoOptions {
  refreshInterval?: number;    // Auto-refresh interval in ms (default: 5 min)
  retryOnError?: boolean;      // Retry on failures (default: true)
  enabled?: boolean;           // Enable/disable the query (default: true)
}

interface UseVersionInfoReturn {
  versionInfo: VersionInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: UseVersionInfoError | null;
  refetch: () => Promise<any>;
  isStale: boolean;
  dataUpdatedAt: number;
  invalidateVersionInfo: () => Promise<void>;
}
```

### שימוש

```tsx
import { useVersionInfo } from '@/hooks/use-version-info';

function VersionIndicator() {
  const { versionInfo, isLoading, error } = useVersionInfo({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    retryOnError: true
  });

  if (isLoading) return <span>Loading...</span>;
  if (error) return <span>Version unavailable</span>;

  return <span>v{versionInfo?.commit}</span>;
}
```

### אסטרטגיית מטמון

| הגדרה | ערך | תיאור |
|---|---|---|
| `staleTime` | 5 דקות | נתונים שנחשבים טריים למשך 5 דקות |
| `gcTime` | 30 דקות | איסוף אשפה לאחר 30 דקות |
| `refetchOnWindowFocus` | `false` | אין אחזור על מתג כרטיסיות |
| `refetchOnReconnect` | `true` | אחזר כאשר הרשת מתחברת מחדש |
| `refetchOnMount` | `false` | דלג על אחזור אם המטמון מכיל נתונים |

### נסה שוב לוגיקה

הקרס מיישם ניסיון חוזר אינטליגנטי עם השבתה אקספוננציאלית:

- לא מנסה שוב על שגיאות לקוח (קודי סטטוס 4xx)
- מנסה שוב שגיאות רשת ושרת עד 2 פעמים
- משתמש בגיבוי אקספוננציאלי: `min(1000 * 2^attempt, 30000ms)` ## רכיב תצוגה בגרסה

רכיב `VersionDisplay` תומך בשלוש גרסאות חזותיות:

### וריאציה מוטבעת (ברירת מחדל)

תצוגה מובנית קומפקטית המציגה את ה-commit hash והזמן היחסי:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### וריאנט תג

תג בצורת גלולה עם רקע שיפוע:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### גרסה מפורטת

כרטיס עם מידע על הגרסה המלאה:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

הגרסה המפורטת מציגה:
- בצע חשיש וזמן יחסי
- שם המחבר
- הודעת התחייבות (שורה ראשונה, מצוטט)
- חותמת זמן של עדכון אחרון (כאשר `showDetails` נכון)
- חותמת זמן סנכרון אחרון
- שם המאגר

### אביזרים

| פרופס | הקלד | ברירת מחדל | תיאור |
|---|---|---|---|
| `className` | `string` | `""` | שיעורי CSS נוספים |
| `variant` | `"inline" \| "badge" \| "detailed"` | `"inline"` | סגנון תצוגה |
| `showDetails` | `boolean` | `false` | הצג פרטים מורחבים (גרסה מפורטת בלבד) |
| `refreshInterval` | `number` | `300000` (5 דקות) | מרווח רענון אוטומטי באלפיות שניות |

### בקרת גישה

הרכיב מכבד את תפקידי המשתמש:
- **משתמשים רגילים**: הרכיב מוסתר כאשר פרטי הגרסה אינם זמינים
- **משתמשי Dev/Admin**: מצב השגיאה מוצג עם הודעת "גרסה לא זמינה".

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## הסבר על גרסה

ה- `VersionTooltip` עוטף כל רכיב עם תיאור כלי ריחוף המציג מידע מפורט על הגרסה:

```tsx
import { VersionTooltip } from '@/components/version/version-tooltip';

function Footer() {
  return (
    <VersionTooltip delay={300}>
      <span>Data v1.0</span>
    </VersionTooltip>
  );
}
```

### תכונות תיאור כלים

| תכונה | תיאור |
|---|---|
| מופע מושהה | עיכוב ניתן להגדרה לפני הופעת הסבר כלים (ברירת מחדל: 300ms) |
| הסתר מהיר | עיכוב של 100 אלפיות השנייה ביציאה מהעכבר לאינטראקציה חלקה |
| רחף הסבר על הכלים | תיאור הכלים נשאר גלוי כאשר מרחף מעליו |
| תמיכה במקלדת | מקש Escape מבטל את תיאור הכלים |
| נגישות | תכונות ARIA ( `role="tooltip"` , `aria-describedby` ) |
| השפלה חיננית | מחזיר ילדים ללא הסבר כלים כאשר הנתונים אינם זמינים |

### אביזרים

| פרופס | הקלד | ברירת מחדל | תיאור |
|---|---|---|---|
| `children` | `ReactNode` | נדרש | אלמנט ההדק |
| `className` | `string` | `""` | שיעורי CSS נוספים |
| `disabled` | `boolean` | `false` | השבת תיאור כלים לחלוטין |
| `delay` | `number` | `300` | הצג עיכוב באלפיות שניות |

## כלי עזר למטמון

הוו `useVersionInfoUtils` מספק פונקציות ניהול מטמון:

```tsx
import { useVersionInfoUtils } from '@/hooks/use-version-info';

function AdminPanel() {
  const {
    prefetchVersionInfo,
    invalidateVersionInfo,
    getVersionInfoFromCache,
    setVersionInfoInCache
  } = useVersionInfoUtils();

  // Prefetch version data before it is needed
  useEffect(() => {
    prefetchVersionInfo();
  }, []);

  // Force refresh
  const handleRefresh = () => invalidateVersionInfo();

  // Read directly from cache
  const cached = getVersionInfoFromCache();
}
```

## עיצוב תאריך

הרכיב `VersionDisplay` כולל כלי עזר לעיצוב תאריכים מזיכרון:

| פונקציה | פלט לדוגמה |
|---|---|
| `formatDate` | "15 בינואר 2025, 14:30" |
| `getRelativeTime` | "רק עכשיו", "לפני 3 שעות", "לפני יומיים", "15 בינואר" |
| `getRepositoryName` | "תמיד עובד/נתונים-מעקב-זמן מדהים" |

## קבצי מפתח

| קובץ | נתיב |
|---|---|
| הוק מידע גרסה | `hooks/use-version-info.ts` |
| תצוגת גרסה | `components/version/version-display.tsx` |
| תיאור כלי גרסה | `components/version/version-tooltip.tsx` |
| מסלול API של גרסה | `app/api/version/route.ts` |
