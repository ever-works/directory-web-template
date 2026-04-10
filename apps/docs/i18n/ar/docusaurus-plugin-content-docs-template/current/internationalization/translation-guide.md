---
id: translation-guide
title: دليل الترجمة
sidebar_label: دليل الترجمة
sidebar_position: 2
---

# دليل الترجمة

يشرح هذا الدليل كيفية استخدام وتوسيع نظام الترجمة متعدد اللغات في Ever Works المبني على next-intl.

## اللغات المدعومة

يدعم Ever Works أكثر من 13 لغة:

| اللغة | الرمز | العلم |
|----------|------|------|
| 🇬🇧 الإنجليزية | `en` | افتراضي |
| 🇫🇷 الفرنسية | `fr` | |
| 🇪🇸 الإسبانية | `es` | |
| 🇩🇪 الألمانية | `de` | |
| 🇨🇳 الصينية | `zh` | |
| 🇸🇦 العربية | `ar` | دعم RTL |
| 🇮🇹 الإيطالية | `it` | |
| 🇵🇹 البرتغالية | `pt` | |
| 🇷🇺 الروسية | `ru` | |
| 🇳🇱 الهولندية | `nl` | |
| 🇵🇱 البولندية | `pl` | |

## الاستخدام

### في مكوّنات React

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('help');

  return (
    <div>
      <h1>{t('PAGE_TITLE')}</h1>
      <p>{t('PAGE_SUBTITLE')}</p>
    </div>
  );
}
```

## إضافة ترجمات جديدة

### الخطوة 1: إضافة المفاتيح بالإنجليزية

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### الخطوة 2: الترجمة إلى لغات أخرى

```json
{
  "help": {
    "NEW_SECTION_TITLE": "قسم جديد",
    "NEW_SECTION_DESC": "وصف القسم الجديد"
  }
}
```

## مساحات أسماء الترجمة

### عام (`common`)
- عناصر التنقل
- الإجراءات الشائعة (حفظ، إلغاء، حذف)

### المصادقة (`auth`)
- تسجيل الدخول والتسجيل
- إدارة كلمة المرور

### المساعدة (`help`)
- محتوى مركز المساعدة
- أقسام الأسئلة الشائعة

## أفضل الممارسات

### 1. اتفاقيات التسمية

```json
{
  // ✅ جيد
  "FAQ_SETUP_TIME": "How long does setup take?",
  
  // ❌ سيء
  "FAQ_1": "How long does setup take?"
}
```

### 2. المتغيرات والعناصر النائبة

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

### 3. صيغة الجمع

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

## إضافة لغة جديدة

### الخطوة 1: إنشاء ملف الرسائل

```bash
cp messages/en.json messages/ar.json
```

### الخطوة 2: تحديث الإعداد

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'ru'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### الخطوة 3: إضافة أيقونة العلم

ضع ملف SVG في `/public/flags/ar.svg`

### الخطوة 4: ترجمة المحتوى

ترجم جميع المفاتيح في `messages/ar.json` إلى العربية

## الأدوات الموصى بها

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - امتداد VS Code لإدارة الترجمات
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - محرر ترجمة مرئي
- **[Crowdin](https://crowdin.com/)** - منصة ترجمة تعاونية

## قائمة التحقق من الترجمة

عند إضافة ميزات جديدة تحتوي على نصوص:

- [ ] إضافة المفاتيح بالإنجليزية (`en.json`)
- [ ] ترجمة إلى الفرنسية (`fr.json`)
- [ ] ترجمة إلى الإسبانية (`es.json`)
- [ ] ترجمة إلى الألمانية (`de.json`)
