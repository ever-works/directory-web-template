---
id: ci-cd
title: خط أنابيب CI/CD
sidebar_label: CI/CD
sidebar_position: 3
---

# خط أنابيب CI/CD

يتضمن قالب Ever Works خط أنابيب CI/CD متكامل مبني على GitHub Actions. يغطي هذا الدليل بنية سير العمل، وفحص الأمان، واستراتيجيات حماية الفروع، وإجراءات الترقية في النشر.

## نظرة عامة على سير العمل

يتكون خط الأنابيب من ستة ملفات سير عمل في `.github/workflows/`:

| سير العمل | الملف | المُشغِّل | الغرض |
|---|---|---|---|
| CI | `ci.yml` | دفع/PR إلى `main`، `develop` | Lint، فحص الأنواع، البناء |
| CodeQL | `codeql.yml` | دفع/PR إلى `main`، `develop` + أسبوعي | تحليل ثغرات الأمان |
| Dev Deploy | `deploy_dev.yaml` | دفع إلى `develop` | نشر بيئة المعاينة |
| Prod Deploy | `deploy_prod.yaml` | دفع إلى `main` | نشر بيئة الإنتاج |
| Vercel Deploy | `deploy_vercel.yaml` | يُستدعى من dev/prod | منطق نشر Vercel المشترك |
| Disable CodeQL | `disable-default-codeql.yml` | يدوي فقط | أداة حل تعارضات CodeQL |

### تدفق خط الأنابيب

```
Feature Branch --> PR to develop --> CI runs
                                     |
                                     v
                               Merge to develop --> Dev Deploy (preview)
                                     |
                                     v
                               PR to main --> CI runs
                                     |
                                     v
                               Merge to main --> Prod Deploy (production)
```

## سير عمل CI (ci.yml)

يعمل CI عند كل دفع وطلب سحب إلى `main` و`develop`. يتحقق من جودة الكود ويضمن بناء المشروع بنجاح.

### المهام

يحتوي سير العمل على مهمة `lint-and-build` واحدة تعمل على `ubuntu-latest`:

**الخطوات**:

1. **استرجاع الكود** -- استنساخ المستودع
2. **الكشف عن مدير الحزم** -- الكشف التلقائي عن pnpm أو yarn أو npm من ملف القفل
3. **إعداد pnpm** -- تثبيت pnpm v9 إذا اكتُشف
4. **إعداد Node.js** -- تثبيت Node 20 مع تخزين مؤقت لمدير الحزم
5. **تثبيت التبعيات** -- تشغيل `pnpm install`
6. **تشغيل Lint** -- تشغيل `pnpm lint` (الاستمرار عند الخطأ للـ PR)
7. **فحص الأنواع** -- تشغيل `pnpm typecheck` أو `pnpm check:types`
8. **إنشاء مجلد المحتوى** -- إنشاء `.content/data` للبناء
9. **بناء المشروع** -- تشغيل `pnpm build` مع جميع متغيرات البيئة اللازمة
10. **التحقق من نجاح البناء** -- التحقق من إنشاء مجلد `.next`

### التحكم في التزامنية

```yaml
concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true
```

إذا حدث دفع جديد للفرع نفسه أثناء تشغيل CI، يُلغى التشغيل السابق تلقائياً. هذا يوفر دقائق CI ويضمن التحقق من آخر commit فقط.

### متغيرات البيئة

يستخدم سير عمل CI مزيجاً من القيم الافتراضية المشفرة وأسرار GitHub:

| المتغير | المصدر | الغرض |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | مشفر | URL التطبيق للبناء |
| `DATABASE_URL` | سر أو قيمة افتراضية | اتصال قاعدة البيانات للبناء |
| `AUTH_SECRET` | قيمة CI مشفرة | توقيع رمز المصادقة (غير إنتاج) |
| `DATA_REPOSITORY` | سر أو قيمة افتراضية | URL مستودع المحتوى |
| `CONTENT_WARNINGS_SILENT` | مشفر `true` | إسكات تحذيرات المحتوى في CI |
| `CI` | مشفر `true` | الإشارة إلى بيئة CI |
| أسرار OAuth | أسرار GitHub | بيانات اعتماد Google وGitHub وFacebook وTwitter |
| `RESEND_API_KEY` | سر GitHub | خدمة البريد الإلكتروني لفحوصات البناء |

### الأذونات

يطلب سير العمل الحد الأدنى من الأذونات:

```yaml
permissions:
  contents: read
```

تحتاج مهمة CI فقط إلى أذونات القراءة لمحتوى المستودع.

## تحليل أمان CodeQL (codeql.yml)

### ما يفعله

ينفذ CodeQL تحليلاً دلالياً لكود JavaScript/TypeScript لاكتشاف ثغرات الأمان. يعمل عند:

- كل دفع وطلب سحب إلى `main` و`develop`
- كل يوم اثنين الساعة 6:00 صباحاً UTC (فحص مجدول)
- عند التشغيل اليدوي

### خطوات التحليل

1. **الاسترجاع** و**إعداد** Node.js + pnpm
2. **تهيئة CodeQL** باللغة `javascript-typescript`
3. **تكوين بيئة CodeQL** عبر `scripts/codeql-setup.js`
4. **تثبيت التبعيات**/سياق التحليل
5. **Autobuild** -- الكشف التلقائي ببناء CodeQL
6. **رفع التحليل** -- رفع النتائج إلى تبويب Security في GitHub
7. **تحليل احتياطي** -- التحليل بدون رفع إذا فشل الرفع

### الأذونات

يحتاج CodeQL إلى أذونات أوسع للإبلاغ عن أحداث الأمان:

```yaml
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
```

### عرض النتائج

بعد تشغيل ناجح مع رفع:
1. انتقل إلى المستودع على GitHub
2. اذهب إلى **Security** > **Code scanning**
3. مراجعة النتائج والتصفية حسب الخطورة وإدارة التنبيهات

### حل تعارضات CodeQL

إذا واجهت تعارضات معالجة SARIF مع تكوين CodeQL الافتراضي في GitHub، استخدم سير عمل `disable-default-codeql.yml`:

```bash
# Trigger manually from GitHub Actions tab
# This disables the default configuration that may conflict with your custom setup
```

## تدفق النشر

### تخطيط الفرع-البيئة

| الفرع | سير العمل | البيئة | النطاق |
|---|---|---|---|
| `develop` | `deploy_dev.yaml` | `preview` | URL معاينة Vercel |
| `main` | `deploy_prod.yaml` | `production` | نطاق الإنتاج |

### بوابة موفر النشر

يفحص كلا سيري عمل النشر متغير المستودع قبل المتابعة:

```yaml
jobs:
  Vercel:
    if: ${{ vars.DEPLOY_PROVIDER == 'vercel' }}
```

اضبط `DEPLOY_PROVIDER=vercel` في **الإعدادات > المتغيرات** بالمستودع لتمكين نشر Vercel. يتيح هذا تبديل موفر النشر دون تعديل ملفات سير العمل.

### نشر Vercel (deploy_vercel.yaml)

يتعامل سير عمل Vercel المشترك مع نشر المعاينة والإنتاج.

**استراتيجية النشر**: يستخدم سير العمل نهجاً من مرحلتين:

1. **نشر API** (الأساسي): تشغيل النشر عبر Vercel API لبناء أسرع
2. **احتياطي CLI**: الرجوع إلى `vercel build` + `vercel deploy --prebuilt` إذا فشل استدعاء API

**الخطوات**:

1. **استرجاع** الكود
2. **الكشف عن مدير الحزم** وإعداد pnpm
3. **تثبيت Vercel CLI** عالمياً
4. **ربط مشروع Vercel** بـ `VERCEL_TOKEN` ونطاق الفريق الاختياري
5. **ضبط متغيرات البيئة** عبر Vercel CLI (DATA_REPOSITORY، GH_TOKEN، CRON_SECRET)
6. **سحب إعدادات Vercel** للبيئة الهدف
7. **تشغيل نشر API** أو الرجوع إلى بناء/نشر CLI
8. **تحديث جدولة cron** عبر `scripts/update-cron.ts`

### الأسرار المطلوبة

اضبط هذه في أسرار مستودع GitHub:

| السر | مطلوب | الغرض |
|---|---|---|
| `VERCEL_TOKEN` | نعم | مصادقة Vercel API |
| `VERCEL_TEAM_SCOPE` | عند استخدام فريق | Slug فريق Vercel |
| `DATA_REPOSITORY` | نعم | اسم مستودع المحتوى |
| `GH_TOKEN` | نعم | رمز GitHub لاستنساخ المحتوى |
| `CRON_SECRET` | موصى به | مصادقة استدعاءات نقاط نهاية cron |
| `DATABASE_URL` | وقت البناء | سلسلة اتصال قاعدة البيانات |
| أسرار OAuth | عند استخدام OAuth | بيانات اعتماد الموفر |

### تحديث جدولة Cron

بعد نشر ناجح، يشغّل سير العمل `scripts/update-cron.ts` لمزامنة جدولة cron:

```yaml
- name: Update cron schedule
  if: success() && steps.trigger_deployment.outputs.deployment_id != ''
  run: npx tsx scripts/update-cron.ts
```

## قواعد حماية الفروع

### الإعدادات الموصى بها لـ `main`

| الإعداد | القيمة | الغرض |
|---|---|---|
| طلب سحب مطلوب | نعم | منع الدفع المباشر للإنتاج |
| مراجعات مطلوبة | 1+ | مراجعة الكود قبل الدمج |
| فحوصات الحالة المطلوبة | CI (lint-and-build) | يجب أن ينجح CI قبل الدمج |
| فحص CodeQL مطلوب | تحليل CodeQL | يجب أن يمر الفحص الأمني |
| فرع محدث مطلوب | نعم | يجب أن يكون PR مبنياً على آخر main |
| تضمين المسؤولين | نعم | القواعد تنطبق على جميع المستخدمين |

### الإعدادات الموصى بها لـ `develop`

| الإعداد | القيمة | الغرض |
|---|---|---|
| طلب سحب مطلوب | اختياري | السماح بالدفع المباشر للتكرار السريع |
| فحوصات الحالة المطلوبة | CI (lint-and-build) | بوابة جودة أساسية |
| فرع محدث مطلوب | لا | السماح بتكرار أسرع |

### تكوين حماية الفروع

1. انتقل إلى **الإعدادات** > **الفروع** في المستودع
2. انقر على **إضافة قاعدة حماية فرع**
3. أدخل نمط اسم الفرع (مثلاً `main`)
4. اضبط الإعدادات من الجدول أعلاه
5. احفظ التغييرات

## تدفق الترقية

يتبع القالب تدفق ترقية قياسياً:

### دورة التطوير

```
1. Create feature branch from develop
2. Implement changes
3. Open PR to develop
4. CI validates (lint, type check, build)
5. CodeQL scans for vulnerabilities
6. Code review and approval
7. Merge to develop --> automatic preview deployment
```

### إصدار الإنتاج

```
1. Open PR from develop to main
2. CI validates against main
3. CodeQL security scan
4. Final code review
5. Merge to main --> automatic production deployment
```

### تدفق الإصلاح العاجل

```
1. Create hotfix branch from main
2. Implement fix
3. Open PR directly to main
4. CI + CodeQL validation
5. Emergency review and merge
6. Backport to develop
```

## التخصيص

### إضافة خطوات CI جديدة

لإضافة اختبارات أو تحقق إضافي، أضف خطوات إلى المهمة في `ci.yml`:

```yaml
- name: Run unit tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test

- name: Run E2E tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test:e2e
```

### إضافة إشعارات النشر

أضف خطوة إشعار في نهاية سير عمل النشر:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text": "Deployed to ${{ inputs.environment }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### متغيرات البيئة الخاصة بالبيئة

استخدم **البيئات** في GitHub لتقييد الأسرار على أهداف نشر محددة:

1. انتقل إلى **الإعدادات** > **البيئات**
2. أنشئ بيئتي `production` و`preview`
3. أضف أسراراً خاصة بكل بيئة
4. أشر إليها باستخدام تكوين `environment:` في سير العمل
