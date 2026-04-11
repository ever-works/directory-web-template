---
id: user-profiles
title: ملفات تعريف المستخدمين والإعدادات
sidebar_label: ملفات تعريف المستخدمين
sidebar_position: 18
---

# ملفات تعريف المستخدم والإعدادات

يتضمن قالب Ever Works نظام ملف تعريف المستخدم مع صفحات الملف الشخصي العامة، والتنقل المبوب، وإدارة الصور الرمزية، والروابط الاجتماعية، ومكونات عرض الملف الشخصي. يمكن للمستخدمين عرض معلوماتهم ومحفظتهم ومهاراتهم والعناصر المقدمة من خلال واجهة ملف تعريف منظمة.

## نظرة عامة على الهندسة المعمارية

| مكون | المسار | الغرض |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | محتوى صفحة الملف الشخصي الرئيسية مع توجيه علامة التبويب |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | شريط التنقل لعلامات التبويب الثابتة |
| 4ـ | 5 ــ | غلاف الملف الشخصي، والصورة الرمزية، والسيرة الذاتية، والروابط الاجتماعية |
| 6ـ | `components/profile/profile-tag.tsx` | مكون علامة المهارة/الاهتمام |
| 8ـ | `components/header/profile-button.tsx` | مشغل قائمة ملف تعريف الرأس |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | قائمة الملف الشخصي المنسدلة |

## بنية بيانات الملف الشخصي

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

## رأس الملف الشخصي

يعرض المكون `ProfileHeader` القسم العلوي من ملف تعريف المستخدم مع شعار غلاف متدرج، وصورة رمزية مع زر تحرير، ومعلومات السيرة الذاتية:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### الميزات

| ميزة | الوصف |
|---|---|
| شعار الغلاف | خلفية متدرجة باستخدام الألوان الأساسية والثانوية للموضوع |
| الصورة الرمزية | صورة دائرية ذات حدود حلقية، مقاس سريع الاستجابة (24 × 24 إلى 28 × 28) |
| زر تحرير | يظهر فقط عندما يكون `isOwnProfile` صحيحًا |
| صورة احتياطية | يُظهر العنصر النائب لرمز المستخدم عند حدوث خطأ في تحميل الصورة |
| روابط اجتماعية | يعرض أيقونات خاصة بالمنصة (GitHub وLinkedIn وTwitter) |
| الموقع والشركة | يعرض مع دبوس الخريطة وأيقونات الحقيبة |
| رابط الموقع | رابط خارجي مع أيقونة الكرة الأرضية |

### معالجة أخطاء الصورة الرمزية

يتضمن المكون معالجة قوية لأخطاء الصورة:

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

### أيقونات المنصات الاجتماعية

| منصة | أيقونة |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| 4ـ | 5 ــ |
| أخرى | 6ـ (عام) |

## التنقل في الملف الشخصي

يوفر المكون 7 تنقلًا مبوبًا ثابتًا:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### علامات التبويب المتاحة

| معرف علامة التبويب | التسمية | أيقونة |
|---|---|---|
| `about` | حول | `FiUser` |
| `portfolio` | المحفظة | `FiBriefcase` |
| 4ـ | مهارات | 5 ــ |
| 6ـ | التقديمات | `FiFileText` |

### ميزات التنقل

- **وضع ثابت** - يظل في الأعلى عند التمرير بخلفية ضبابية
- **متوافق مع الهاتف المحمول** - تمرير أفقي على الشاشات الصغيرة
- **التركيز مرئي** - مؤشر حلقي للتنقل عبر لوحة المفاتيح
- **مدرك للموضوع** - تستخدم علامة التبويب النشطة الألوان الأساسية للموضوع

## محتوى الملف الشخصي

يقوم المكون 8 بتنظيم صفحة الملف الشخصي من خلال الجمع بين محتوى التنقل وعلامة التبويب:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### أقسام علامة التبويب

| القسم | مكون | المحتوى |
|---|---|---|
| حول | `AboutSection` | المعلومات الشخصية والسيرة الذاتية والتفاصيل |
| المحفظة | `PortfolioSection` | نماذج أعمال ومشاريع |
| مهارات | `SkillsSection` | علامات المهارات والخبرات |
| التقديمات | `SubmissionsSection` | العناصر المقدمة من قبل المستخدم |

يتم تقديم كل قسم برأس ثابت:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## مكونات زر الملف الشخصي

### زر ملف تعريف الرأس

زر في رأس الموقع يفتح قائمة الملف الشخصي:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### عرض رأس الملف الشخصي

يظهر اسم المستخدم والصورة الرمزية في شكل مضغوط:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### قائمة الملف الشخصي

قائمة منسدلة تحتوي على إجراءات الملف الشخصي:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## تصميم سريع الاستجابة

تم إنشاء مكونات الملف الشخصي باستخدام نهج الهاتف المحمول أولاً:

| نقطة التوقف | السلوك |
|---|---|
| الجوال | الصورة الرمزية المركزية، التخطيط المكدس، تمرير علامة التبويب الأفقية |
| تابلت+ | صورة رمزية بمحاذاة إلى اليسار، تخطيط جنبًا إلى جنب |
| سطح المكتب | بطاقة كاملة العرض مع قيود العرض القصوى |

### حجم الصورة الرمزية

| شاشة | الحجم |
|---|---|
| الجوال | 24 × 24 (96 بكسل) |
| سطح المكتب | 28 × 28 (112 بكسل) |

## تكامل الموضوع

يستخدم نظام الملفات الشخصية نظام سمات القالب:

- يستخدم التدرج اللوني لشعار الغلاف متغيرات CSS 0 و 1
- تستخدم حالات علامة التبويب النشطة الألوان الأساسية للموضوع
- الوضع الداكن مدعوم بالكامل بنسب تباين مناسبة
- تستخدم حالات التمرير انتقالات لونية مدركة للموضوع

## هيكل التخطيط

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

## الملفات الرئيسية

| ملف | المسار |
|---|---|
| محتوى الملف الشخصي | `components/profile/profile-content.tsx` |
| التنقل في الملف الشخصي | `components/profile/profile-navigation.tsx` |
| رأس الملف الشخصي | `components/profile/profile-header.tsx` |
| علامة الملف الشخصي | `components/profile/profile-tag.tsx` |
| زر ملف تعريف الرأس | 4ـ |
| قائمة الملف الشخصي | 5 ــ |
| أنواع الملفات الشخصية | 6ـ |
