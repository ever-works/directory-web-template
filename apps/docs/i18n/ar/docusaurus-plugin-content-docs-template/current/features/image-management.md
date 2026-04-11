---
id: image-management
title: إدارة الصور
sidebar_label: إدارة الصور
sidebar_position: 21
---

# إدارة الصور

يشتمل قالب Ever Works على نظام إدارة مجال الصور الذي يتحكم في مضيفي الصور الخارجيين المسموح لهم بتحسين صورة Next.js. يحتفظ النظام بقوائم المجالات المنسقة لموفري الصور المشتركين وخدمات الأيقونات، ويوفر إدارة مجال وقت التشغيل، والتحقق من صحة عنوان URL، ويقوم بإنشاء تكوين "0" لـ "1".

## نظرة عامة على الهندسة المعمارية

| مكون | المسار | الغرض |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | قوائم المجال الأساسية، وإنشاء الأنماط، وأدوات التحقق من الصحة |
| 4ـ | 5 ــ | خطاف الرد لإدارة المجالات في وقت التشغيل |
| 6ـ | `hooks/use-image-domains.ts` | خطاف رد الفعل للتحقق من صحة عناوين URL للصور مقابل النطاقات المسموح بها |

## المجالات التي تم تكوينها مسبقًا

يأتي النظام مع قائمتين للمجالات المنسقة:

### مجالات الصور المشتركة

هذه هي خدمات استضافة الصور القياسية المستخدمة للصور الرمزية للمستخدم وصور المحتوى:

| المجال | الغرض |
|---|---|
| 8ـ | صور الملف الشخصي لمستخدم جوجل |
| `avatars.githubusercontent.com` | الصور الرمزية لمستخدم GitHub |
| `platform-lookaside.fbsbx.com` | صور بروفايل فيس بوك |
| `pbs.twimg.com` | صور الملف الشخصي على Twitter/X |
| ‹‹١٢› | Unsplash معرض الصور الفوتوغرافية |

### مجالات الأيقونات

خدمات مخصصة للأيقونات وأصول التصميم:

| المجال | الغرض |
|---|---|
| 13 ــ | أيقونات فلاتيكون |
| 14 ــ | مكتبة أيقونة Iconify |
| `icons8.com` | أصول Icons8 |
| 16 ــ | مجموعة أيقونة الريشة |
| `heroicons.com` | مكتبة الأبطال |
| 18 ــ | أيقونات الطاولة |

## أنماط Next.js البعيدة

تقوم الوظيفة 19 بإنشاء الصفيف 20 لتكوين صورة Next.js:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### الأنماط المولدة

تنتج الوظيفة نوعين من الأنماط:

1. **أنماط محددة** بأسماء مسارات مقيدة للخدمات المعروفة:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **أنماط أحرف البدل** للنطاقات الفرعية لجميع النطاقات المسجلة:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## التحقق من صحة المجال

### 0

التحقق مما إذا كان اسم مضيف عنوان URL موجودًا في قائمة النطاقات المسموح بها:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

تقوم الوظيفة بثلاثة مستويات من المطابقة:

| تحقق | الوصف |
|---|---|
| تطابق تام | يتطابق اسم المضيف مع المجال الموجود في أي من القائمتين تمامًا |
| مطابقة النطاق الفرعي | ينتهي اسم المضيف بـ `.{domain}` لأي مجال مسجل |
| تمرير غير HTTP | عناوين URL التي لا تحتوي على البادئة `http://` أو `https://` تمر دائمًا |

### 3

التحقق من صحة ما إذا كانت السلسلة عبارة عن عنوان URL صالح من الناحية الهيكلية للصورة:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### 0

يكتشف عناوين URL التي من المحتمل ألا تكون روابط صور مباشرة:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| قاعدة الكشف | الوصف |
|---|---|
| عناوين URL لصفحات Flaticon | عناوين URL ذات المسار `/icone-gratuite/` على flaticon.com |
| إعادة توجيه المعلمات | عناوين URL التي تحتوي على معلمات استعلام 1 أو 2 |
| ملحق الصورة مفقود | عناوين URL بدون "3" أو "4" أو "5" أو "6" أو "7" أو "8" أو "9" |

###10

يحدد ما إذا كان سيتم عرض أيقونة احتياطية بدلاً من الصورة:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## إدارة مجال وقت التشغيل

### إضافة النطاقات

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

الوظيفة غير فعالة - إن إضافة مجال مسجل بالفعل ليس له أي تأثير.

### إزالة النطاقات

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### الحصول على كافة المجالات

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

إرجاع نسخ من صفائف المجال، ومنع الطفرات الخارجية.

## الخطاف

خطاف React لإدارة مجالات الصور مع مزامنة الحالة:

```tsx
import { useImageDomains } from '@/hooks/use-image-domains';

function ImageDomainManager() {
  const { domains, addDomain, removeDomain, checkDomain } = useImageDomains();

  return (
    <div>
      <h3>Common Domains ({domains.common.length})</h3>
      <ul>
        {domains.common.map(domain => (
          <li key={domain}>
            {domain}
            <button onClick={() => removeDomain(domain)}>Remove</button>
          </li>
        ))}
      </ul>

      <h3>Icon Domains ({domains.icons.length})</h3>
      <ul>
        {domains.icons.map(domain => (
          <li key={domain}>{domain}</li>
        ))}
      </ul>

      <button onClick={() => addDomain('cdn.new-service.com')}>
        Add Domain
      </button>
    </div>
  );
}
```

### هوك API

| الطريقة | المعلمات | الوصف |
|---|---|---|
| `domains` | -- | الحالة الحالية: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | إضافة مجال وتحديث الحالة |
| 4ـ | 5 ــ | قم بإزالة المجال (تطبيع الإدخال) وتحديث الحالة |
| 6ـ | `(url: string)` | تحقق مما إذا كان مجال عنوان URL مسموحًا به |

تعمل الطريقة 8 على تطبيع الإدخال عن طريق قطع المسافات البيضاء والأحرف الصغيرة وإزالة بادئات أحرف البدل (9 ).

## الخطاف 10

خطاف خفيف الوزن للتحقق من صحة عناوين URL للصور مقابل قائمة النطاقات المسموح بها:

```tsx
import { useImageValidation } from '@/hooks/use-image-domains';

function ImageUrlInput({ value, onChange }) {
  const { checkImageUrl } = useImageValidation();

  const handleChange = (url: string) => {
    const { isValid, error } = checkImageUrl(url);
    if (!isValid) {
      console.warn(error);
      // e.g., "Domain not allowed. Add cdn.example.com to image domains configuration."
    }
    onChange(url);
  };

  return <input value={value} onChange={(e) => handleChange(e.target.value)} />;
}
```

### نتائج التحقق

| السيناريو | `isValid` | `error` |
|---|---|---|
| عنوان URL غير HTTP (المسار النسبي) | `true` | -- |
| المجال المسموح به | `true` | -- |
| المجال غير مسموح به | 4ـ | "المجال غير مسموح به. أضف `hostname` إلى تكوين نطاقات الصورة." |
| تنسيق عنوان URL غير صالح | 6ـ | "تنسيق عنوان URL غير صالح" |

## الملفات الرئيسية

| ملف | المسار |
|---|---|
| فائدة مجالات الصورة | `lib/utils/image-domains.ts` |
| ربط مجالات الصورة | 8ـ |
| ربط التحقق من صحة الصورة | `hooks/use-image-domains.ts` |
