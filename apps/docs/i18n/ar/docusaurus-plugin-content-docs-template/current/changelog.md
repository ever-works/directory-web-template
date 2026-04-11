---
id: changelog
title: سجل التغييرات
sidebar_label: السجل
---

# سجل التغييرات

تشرح هذه الصفحة كيفية إدارة Directory Web Template للإصدارات والإطلاقات ومسارات الترقية.

## الإصدار الدلالي

يتبع القالب [الإصدار الدلالي (SemVer)](https://semver.org/). تستخدم أرقام الإصدارات تنسيق **MAJOR.MINOR.PATCH**:

| المكوّن    | متى يُزاد                                                      |
| ---------- | --------------------------------------------------------------- |
| **MAJOR**  | تغييرات جذرية تستلزم خطوات ترحيل                               |
| **MINOR**  | ميزات جديدة مُضافة بطريقة متوافقة مع الإصدارات السابقة         |
| **PATCH**  | إصلاحات أخطاء متوافقة مع الإصدارات السابقة وتحسينات طفيفة      |

قد تستخدم إصدارات ما قبل الإطلاق لاحقات مثل `-alpha.1` أو `-beta.2` أو `-rc.1` للاختبار المبكر.

## ترحيل قاعدة البيانات

يستخدم القالب **Drizzle ORM** مع PostgreSQL. تُدار تغييرات مخطط قاعدة البيانات من خلال Drizzle Kit:

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio for visual database management
pnpm db:studio
```

تُخزَّن ملفات الترحيل في مجلد `lib/db/migrations/`. كل ترحيل عبارة عن ملف SQL مُوَلَّد من التغييرات التي أُجريت على تعريفات مخطط Drizzle في `lib/db/schema/`.

## ترقية القالب

عند الترقية إلى إصدار أحدث:

```bash
cd directory-web-template

# Pull latest changes
git pull origin main

# Install updated dependencies
pnpm install

# Apply database migrations
pnpm db:migrate

# Verify build
pnpm build
```

### التعامل مع التعارضات أثناء الترقية

إذا كنت قد خصّصت القالب، فقد تواجه تعارضات دمج عند سحب التحديثات. النهج الموصى به:

1. **احتفظ بالتخصيصات في ملفات منفصلة** كلما أمكن ذلك (مكونات مخصصة، مسارات جديدة، خدمات إضافية).
2. **استخدم نظام إدارة المحتوى المستند إلى Git** لتغييرات المحتوى بدلاً من تعديل الملفات الأساسية.
3. **راجع ملاحظات الإصدار** قبل الترقية لفهم الملفات التي تغيرت.
4. **اختبر بشكل شامل** بعد حل التعارضات بتشغيل `pnpm lint` و`pnpm tsc --noEmit` و`pnpm build`.

## تتبع الإصدارات

### GitHub Releases

تُنشر الإصدارات على GitHub في [github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases).

يتضمن كل إصدار:

- علامة الإصدار (مثل `v0.1.0`)
- ملاحظات الإصدار التي تصف التغييرات والميزات الجديدة وإصلاحات الأخطاء والتغييرات الجذرية
- روابط لطلبات السحب والمشكلات ذات الصلة

### سجل الإيداعات

يستخدم المستودع [Conventional Commits](https://www.conventionalcommits.org/)، مما يسهّل تصفح سجل الإيداعات بحثاً عن التغييرات:

```bash
# View recent commits with conventional commit prefixes
git log --oneline --since="2025-01-01"

# Filter for feature commits only
git log --oneline --grep="^feat:"

# Filter for breaking changes
git log --oneline --grep="BREAKING CHANGE"
```

## سياسة التغييرات الجذرية

تُؤخذ التغييرات الجذرية على محمل الجد. يتبع المشروع هذه المبادئ:

1. **إشعار مسبق.** تُعلَن التغييرات الجذرية قبل إصدار ثانوي واحد على الأقل قبل نفاذها، كلما أمكن ذلك.
2. **أدلة الترحيل.** تتضمن كل تغيير جذري دليل ترحيل في ملاحظات الإصدار.
3. **تقليل الاضطراب.** تُجمَّع التغييرات الجذرية في الإصدارات الرئيسية بدلاً من توزيعها على إصدارات ثانوية متعددة.
4. **توافق قاعدة البيانات مع الإصدارات السابقة.** تم تصميم الترحيلات لتكون غير مدمِّرة. يُفضَّل إضافة الأعمدة وإنشاء الجداول على الحذف أو إعادة التسمية.

### أمثلة على التغييرات الجذرية

- إزالة نقطة نهاية API عامة أو إعادة تسميتها
- تغيير بنية أجسام طلبات أو استجابات API
- إزالة أعمدة أو جداول قاعدة البيانات أو إعادة تسميتها
- تغيير متغيرات البيئة المطلوبة
- إيقاف دعم إصدار Node.js
- تغيير سلوك المصادقة أو التفويض
- إزالة أنواع أو واجهات TypeScript المصدَّرة أو إعادة تسميتها

### أمثلة على التغييرات غير الجذرية

- إضافة نقاط نهاية API جديدة
- إضافة حقول اختيارية جديدة إلى أجسام الطلبات أو الاستجابات
- إضافة أعمدة قاعدة بيانات جديدة بقيم افتراضية
- إضافة متغيرات بيئة جديدة بقيم افتراضية معقولة
- إضافة ميزات أو تكاملات جديدة
- تحسينات الأداء
- إصلاحات الأخطاء

## تنسيق سجل التغييرات

تتبع ملاحظات الإصدار هذا الهيكل:

```markdown
## [0.2.0] - 2025-04-15

### Added

- Category-based directory filtering
- New Polar payment provider integration

### Changed

- Improved authentication flow with better error messages

### Fixed

- Resolved race condition in concurrent directory updates
- Fixed pagination offset calculation for search results

### Deprecated

- Legacy REST endpoints under /api/v1/ (use /api/v2/ instead)

### Breaking Changes

- Removed `LEGACY_AUTH_MODE` environment variable
- Renamed `DirectoryItem` type to `Item` across all APIs
```

يتبع هذا التنسيق اصطلاحات [Keep a Changelog](https://keepachangelog.com/).
