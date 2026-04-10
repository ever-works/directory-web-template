---
id: contributing
title: دليل المساهمة
sidebar_label: المساهمة
---

# دليل المساهمة

شكراً لاهتمامك بالمساهمة في Directory Web Template. يغطي هذا الدليل كل ما تحتاج معرفته لتقديم مساهمات ذات قيمة.

## المستودع

يُستضاف الكود المصدري للقالب على [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

للمساهمة في منصة Ever Works، راجع [مستودع المنصة](https://github.com/ever-works/ever-works) ودليل المساهمة الخاص به على [docs.ever.works](https://docs.ever.works).

## المتطلبات المسبقة

قبل البدء، تأكد من تثبيت ما يلي:

- **Node.js** >= 20.19.0 (يُوصى بـ LTS)
- **pnpm** >= 10.x (مطلوب بصرامة؛ لا تستخدم npm أو yarn)
- **Git** >= 2.30
- **PostgreSQL** (لقاعدة البيانات؛ يوفر Supabase خياراً مستضافاً)

### تثبيت pnpm

```bash
# باستخدام corepack (موصى به، يأتي مع Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# أو عبر npm (تمهيد لمرة واحدة)
npm install -g pnpm
```

**مهم:** يستخدم المستودع حقول `packageManager` وملفات القفل الخاصة بـ pnpm. تشغيل `npm install` أو `yarn install` سيفشل أو ينتج أشجار تبعيات غير صحيحة.

## إعداد بيئة التطوير

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# نسخ ملف البيئة وتهيئته
cp .env.example .env.local
# عدّل .env.local بقيمك (راجع README للتفاصيل)

pnpm dev        # خادم تطوير Next.js على المنفذ 3000
```

## معايير الكود

### TypeScript

يستخدم القالب TypeScript في كل مكان. لا تقدّم ملفات `.js` عادية. اتبع ممارسات TypeScript الصارمة:

- مكّن وراعِ إعدادات وضع `strict` في `tsconfig.json`
- فضّل أنواع الإرجاع الصريحة في الدوال المُصدَّرة
- استخدم `unknown` بدلاً من `any` حيثما أمكن
- تحقق من صحة المدخلات باستخدام مخططات **Zod**

### التنسيق (Prettier)

يُطبَّق التنسيق عبر Prettier. يوجد الإعداد في `package.json` الجذري:

```json
{
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed"
}
```

شغّل المنسق قبل الالتزام:

```bash
pnpm format          # تنسيق جميع الملفات
pnpm format:check    # الفحص دون تعديل (متوافق مع CI)
```

### الفحص (ESLint)

يستخدم القالب إعداد ESLint المسطح (`eslint.config.mjs`) مع إضافات React وReact Hooks وTypeScript:

```bash
pnpm lint
```

### اصطلاحات التسمية

| العنصر                    | الاصطلاح         | المثال                                |
| -------------------------- | ---------------- | ------------------------------------- |
| الملفات                    | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| الفئات والواجهات والأنواع  | PascalCase       | `DirectoryService`, `UserProfile`     |
| الدوال والمتغيرات          | camelCase        | `getDirectoryById`, `itemCount`       |
| الثوابت                    | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## اصطلاحات الالتزام

يُطبّق المستودع [Conventional Commits](https://www.conventionalcommits.org/) عبر **commitlint** وخطافات pre-commit لـ **husky**.

| البادئة     | الاستخدام                                           |
| ----------- | --------------------------------------------------- |
| `feat:`     | ميزات جديدة                                         |
| `fix:`      | إصلاحات الأخطاء                                     |
| `docs:`     | تغييرات التوثيق                                     |
| `refactor:` | إعادة هيكلة الكود دون تغيير السلوك                 |
| `test:`     | إضافة الاختبارات أو تحديثها                         |
| `chore:`    | مهام الصيانة وتحديثات الاعتمادية                    |
| `style:`    | تغييرات التنسيق (دون تغيير المنطق)                  |
| `perf:`     | تحسينات الأداء                                      |
| `ci:`       | تغييرات إعداد CI/CD                                 |

مثال:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## تسمية الفروع

استخدم أسماء فروع وصفية مع بادئة:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## عملية Pull Request

1. **قم بعمل Fork** للمستودع (أو أنشئ فرعاً إذا كان لديك صلاحية الكتابة).
2. **أنشئ فرع ميزة** من `main`.
3. **أجرِ تغييراتك** وفق معايير الكود أعلاه.
4. **شغّل فحوصات الجودة** قبل الدفع (انظر أدناه).
5. **ادفع** فرعك وافتح Pull Request نحو `main`.
6. **أكمل قالب PR** بوصف والمشكلات ذات الصلة وملاحظات الاختبار.
7. **انتظر المراجعة.** سيراجع المشرف PR الخاص بك وقد يطلب تغييرات.
8. بعد الموافقة، سيدمج المشرف PR الخاص بك.

### فحوصات الجودة قبل إرسال PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # فحص TypeScript
pnpm build          # بناء إنتاج كامل
```

### الاختبار

يستخدم القالب **Playwright** لاختبارات end-to-end:

```bash
pnpm test:e2e
```

إذا مسّت تغييراتك وظائف قائمة، فتأكد من اجتياز جميع الاختبارات ذات الصلة. إذا أضفت وظيفة جديدة، فأضف لها اختبارات.

## الرخصة

Directory Web Template مرخص بموجب **رخصة GNU Affero العامة الإصدار 3.0 (AGPL-3.0)**. بتقديم مساهمة، توافق على ترخيص عملك بموجب نفس الرخصة.

## مدونة السلوك

يُتوقع من جميع المساهمين الالتزام بمدونة سلوك المشروع. كن محترماً وبنّاءً وتعاونياً.

## الحصول على المساعدة

إذا كان لديك أسئلة حول المساهمة:

- افتح [نقاشاً على GitHub](https://github.com/ever-works/directory-web-template/discussions)
- انضم إلى [مجتمع Discord](https://discord.gg/ever) للحصول على مساعدة فورية
- راسل [ever@ever.co](mailto:ever@ever.co) للاستفسارات الخاصة
