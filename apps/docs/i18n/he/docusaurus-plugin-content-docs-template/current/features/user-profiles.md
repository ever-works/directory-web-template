---
id: user-profiles
title: פרופילי משתמש והגדרות
sidebar_label: פרופילי משתמש
sidebar_position: 18
---

# פרופילי משתמש והגדרות

תבנית Ever Works כוללת מערכת פרופיל משתמש עם דפי פרופיל ציבוריים, ניווט בכרטיסיות, ניהול אווטאר, קישורים חברתיים ורכיבי תצוגת פרופיל. משתמשים יכולים להציג את המידע שלהם, תיק עבודות, כישורים ופריטים שהוגשו באמצעות ממשק פרופיל מובנה.

## סקירה כללית של אדריכלות

| רכיב | נתיב | מטרה |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | תוכן דף פרופיל ראשי עם ניתוב כרטיסיות |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | סרגל ניווט בכרטיסיות דביקות |
| `ProfileHeader` | `components/profile/profile-header.tsx` | כיסוי פרופיל, אווטאר, ביוגרפיה וקישורים חברתיים |
| `ProfileTag` | `components/profile/profile-tag.tsx` | רכיב תג מיומנות/עניין |
| `ProfileButton` | `components/header/profile-button.tsx` | מפעיל תפריט פרופיל כותרת |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | תפריט פרופיל נפתח |

## מבנה נתוני פרופיל

```tsx
// lib/types/profile.ts
interface Profile {
  displayName: string;
  jobTitle: string;
  bio: string;
  avatar: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  socialLinks: SocialLink[];
}

interface SocialLink {
  platform: string;    // 'github', 'linkedin', 'twitter', etc.
  url: string;
  displayName: string;
}
```

## כותרת פרופיל

הרכיב `ProfileHeader` מציג את החלק העליון של פרופיל משתמש עם מודעת באנר של כיסוי שיפוע, אווטאר עם לחצן עריכה ומידע ביוגרפי:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### תכונות

| תכונה | תיאור |
|---|---|
| באנר כריכה | רקע הדרגתי תוך שימוש בצבעים ראשוניים ומשניים של נושא |
| אווטאר | תמונה מעגלית עם גבול טבעת, גודל רספונסיבי (24x24 עד 28x28) |
| כפתור עריכה | מוצג רק כאשר `isOwnProfile` נכון |
| חזרה לתמונה | מציג מציין מיקום של סמל משתמש בשגיאת טעינת תמונה |
| קישורים חברתיים | מעבד אייקונים ספציפיים לפלטפורמה (GitHub, LinkedIn, Twitter) |
| מיקום & חברה | מציג עם סיכת מפה ותיק סמלים |
| קישור לאתר | קישור חיצוני עם סמל גלובוס |

### טיפול בשגיאות אווטאר

הרכיב כולל טיפול חזק בשגיאות תמונה:

```tsx
const [imageError, setImageError] = useState(false);

// Reset error when avatar URL changes
useEffect(() => {
  setImageError(false);
}, [profile.avatar]);

// Render fallback on error
{!imageError && profile.avatar ? (
  <Image src={profile.avatar} onError={() => setImageError(true)} />
) : (
  <FiUser className="w-8 h-8 text-gray-400" />
)}
```

### אייקוני פלטפורמה חברתית

| פלטפורמה | סמל |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| אחר | `FiGlobe` (גנרי) |

## ניווט בפרופיל

הרכיב `ProfileNavigation` מספק ניווט עם כרטיסיות דביקות:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### כרטיסיות זמינות

| מזהה כרטיסייה | תווית | סמל |
|---|---|---|
| `about` | אודות | `FiUser` |
| `portfolio` | תיק | `FiBriefcase` |
| `skills` | מיומנויות | `FiAward` |
| `submissions` | הגשות | `FiFileText` |

### תכונות ניווט

- **מיקום דביק** - נשאר בראש בעת גלילה עם רקע מטושטש
- **ידידותי לניידים** - גלילה אופקית במסכים קטנים
- **הפוקוס גלוי** - מחוון צלצול לניווט במקלדת
- **מודע לנושא** - כרטיסייה פעילה משתמשת בצבעים עיקריים של נושא

## תוכן פרופיל

הרכיב `ProfileContent` מתזמר את דף הפרופיל על ידי שילוב של תוכן ניווט וכרטיסיות:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### קטעי כרטיסיות

| מדור | רכיב | תוכן |
|---|---|---|
| אודות | `AboutSection` | מידע אישי, ביוגרפיה, פרטים |
| תיק | `PortfolioSection` | דוגמאות ופרויקטים של עבודה |
| מיומנויות | `SkillsSection` | תגי כישורים ומומחיות |
| הגשות | `SubmissionsSection` | פריטים שנשלחו על ידי המשתמש |

כל קטע מוצג עם כותרת עקבית:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## רכיבי לחצן פרופיל

### לחצן פרופיל כותרת

כפתור בכותרת האתר שפותח את תפריט הפרופיל:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### תצוגת כותרת פרופיל

מציג את שם המשתמש והדמות של המשתמש בצורה קומפקטית:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### תפריט פרופיל

תפריט נפתח עם פעולות פרופיל:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## עיצוב רספונסיבי

רכיבי הפרופיל בנויים בגישה הניידת הראשונה:

| נקודת שבירה | התנהגות |
|---|---|
| נייד | אוואטר ממורכז, פריסה מוערמת, גלילה אופקית של כרטיסיות |
| טאבלט+ | אוואטר מיושר לשמאל, פריסה זה לצד זה |
| שולחן עבודה | כרטיס ברוחב מלא עם אילוצי רוחב מרבי |

### גודל אווטאר

| מסך | גודל |
|---|---|
| נייד | 24x24 (96 פיקסלים) |
| שולחן עבודה | 28x28 (112px) |

## שילוב נושאים

מערכת הפרופילים משתמשת במערכת הנושאים של התבנית:

- שיפוע באנר כיסוי משתמש במשתני CSS `--theme-primary` ו `--theme-secondary` - מצבי כרטיסיות פעילים משתמשים בצבעי ערכת נושא
- מצב כהה נתמך באופן מלא עם יחסי ניגודיות מתאימים
- מצבי ריחוף משתמשים במעברי צבע מודעים לנושא

## מבנה פריסה

```
ProfileHeader (cover + avatar + info card)
  |
  +-- Cover Banner (gradient)
  +-- Avatar (overlapping cover)
  +-- Info Card
      +-- Name & Title
      +-- Bio
      +-- Location / Company / Website
      +-- Social Links

ProfileContent
  |
  +-- ProfileNavigation (sticky tabs)
  +-- Active Section
      +-- AboutSection
      +-- PortfolioSection
      +-- SkillsSection
      +-- SubmissionsSection
```

## קבצי מפתח

| קובץ | נתיב |
|---|---|
| תוכן פרופיל | `components/profile/profile-content.tsx` |
| ניווט בפרופיל | `components/profile/profile-navigation.tsx` |
| כותרת פרופיל | `components/profile/profile-header.tsx` |
| תג פרופיל | `components/profile/profile-tag.tsx` |
| לחצן פרופיל כותרת | `components/header/profile-button.tsx` |
| תפריט פרופיל | `components/profile-button/profile-menu.tsx` |
| סוגי פרופילים | `lib/types/profile.ts` |
