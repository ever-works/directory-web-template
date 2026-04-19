---
id: features
title: مميزات المنصة
sidebar_label: الميزات
sidebar_position: 3
---

# مميزات المنصة

يقدم هذا المستند نظرة عامة شاملة على جميع الميزات المتوفرة في النظام الأساسي Ever Works، مرتبة حسب المجال الوظيفي.

## مصادقة المستخدم وإدارة الحساب

### تسجيل المستخدم

**الوصف**: يسمح للمستخدمين الجدد بإنشاء حسابات على المنصة.

**كيفية العمل**:

- يمكن للمستخدمين التسجيل عبر البريد الإلكتروني/كلمة المرور أو موفري OAuth (Google وGitHub وFacebook وTwitter)
- يتم إرسال التحقق من البريد الإلكتروني عند التسجيل
- تتم تجزئة كلمة المرور باستخدام bcrypt قبل التخزين
- عند التسجيل الناجح، يتم إنشاء ملف تعريف العميل تلقائيًا

** تدفق المستخدم **:

1. ينقر المستخدم على "الاشتراك" في الصفحة الرئيسية
2. يختار طريقة التسجيل (البريد الإلكتروني أو OAuth)
3. يقوم بملء المعلومات المطلوبة (الاسم، البريد الإلكتروني، كلمة المرور)
4. يتلقى البريد الإلكتروني التحقق
5. ينقر على رابط التحقق لتفعيل الحساب
6. تمت إعادة التوجيه إلى لوحة تحكم العميل

**الملفات الرئيسية**: `/lib/auth/index.ts`، `/app/[locale]/auth/`

[معرفة المزيد حول إعداد المصادقة →](/authentication/setup-guide)

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

### إدارة كلمة المرور

**الوصف**: يسمح للمستخدمين بتغيير كلمات المرور الخاصة بهم أو إعادة تعيينها.

**الميزات**:

- **تغيير كلمة المرور**: يمكن للمستخدمين المعتمدين تحديث كلمة المرور الخاصة بهم من الإعدادات
- **نسيت كلمة المرور**: يتلقى المستخدمون بريدًا إلكترونيًا يحتوي على رابط إعادة التعيين
- **رمز إعادة الضبط**: رمز مميز محدود المدة لإعادة ضبط كلمة المرور بشكل آمن

**كيفية العمل**:

1. يطلب المستخدم إعادة تعيين كلمة المرور
2. يقوم النظام بإنشاء رمز آمن مخزن في جدول `passwordResetTokens`
3. تم إرسال البريد الإلكتروني مع رابط إعادة التعيين الذي يحتوي على الرمز المميز
4. ينقر المستخدم على الرابط ويدخل كلمة المرور الجديدة
5. يتم إبطال الرمز المميز بعد الاستخدام

**الملفات الرئيسية**: `/app/api/auth/change-password/`، `/lib/db/schema.ts`

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

### البحث والتصفية

**الوصف**: يمكّن المستخدمين من العثور على عناصر محددة باستخدام معايير مختلفة.

**أنواع التصفية**:

- ** البحث عن النص **: البحث عن النص الكامل عبر أسماء العناصر وأوصافها
- **تصفية الفئة**: التصفية حسب فئة واحدة أو فئات متعددة
- **تصفية العلامات**: التصفية حسب العلامات المخصصة للعناصر
- **المرشحات المدمجة**: قم بتطبيق مرشحات متعددة في وقت واحد

**كيفية العمل**:

1. يتم تخزين عوامل التصفية في معلمات URL لإمكانية المشاركة
2. `FilterProvider` يدير السياق حالة التصفية
3. `FilterURLParser` يقوم بمزامنة عنوان URL مع حالة التصفية
4. تتم تصفية العناصر من جانب الخادم وإعادتها إلى العميل

**تجربة المستخدم**:

- تستمر عوامل التصفية في عنوان URL (قابل للإشارة المرجعية/القابل للمشاركة)
- تحديث النتائج في الوقت الحقيقي
- مسح كافة خيارات المرشحات

**الملفات الرئيسية**: `/components/filter-provider.tsx`، `/components/filter-url-parser.tsx`

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

### نظام العلامات

**الوصف**: تصنيف مسطح لتنظيم العناصر عبر الفئات.

**الميزات**:

- علامات متعددة لكل عنصر
- عرض سحابة العلامة
- التصفية على أساس العلامات
- يمكن تمكينه/تعطيله عبر إعدادات المسؤول

**كيفية العمل**:

- العلامات المخزنة في `.content/tags/` كملفات تخفيض السعر
- علاقة كثير إلى كثير مع العناصر
- العلامات القابلة للنقر تقوم بتصفية قائمة العناصر

**الملفات الرئيسية**: `/app/[locale]/tags/`، `/lib/services/tag-git.service.ts`

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

### نظام التقييم

**الوصف**: يمكن للمستخدمين تقييم العناصر على مقياس من 1 إلى 5 نجوم.

**كيفية العمل**:

- التقييم هو جزء من نظام التعليق
- يمكن أن يتضمن كل تعليق تقييمًا
- متوسط التقييم المحسوب والمعروض
- توزيع التقييم الموضح (كم عدد 5 نجوم، 4 نجوم، وما إلى ذلك)

**العرض**:

- أيقونات النجوم تظهر متوسط التقييم
- عدد التقييمات بجوار النجوم
- تصنيف التصنيف في صفحة تفاصيل العنصر

**الملفات الرئيسية**: `/hooks/use-item-rating.ts`، `/lib/db/schema.ts` (جدول التعليقات)

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

### نظام المفضلة

**الوصف**: يمكن للمستخدمين حفظ العناصر في قائمة المفضلة لديهم للوصول السريع.

**كيفية العمل**:

1. ينقر المستخدم على أيقونة القلب/المفضلة في العنصر
2. تمت إضافة العنصر إلى الجدول `favorites`
3. المفضلة يمكن الوصول إليها من ملف تعريف المستخدم
4. تبديل الإجراء (انقر مرة أخرى للإزالة)

**الميزات**:

- قائمة المفضلة في بوابة العميل
- عمل سريع غير مفضل
- عدد المفضلة على العناصر (اختياري)
- تصدير قائمة المفضلة

**الملفات الرئيسية**: `/hooks/use-favorites.ts`، `/app/api/favorites/`، `/app/[locale]/favorites/`

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

## تقديم السلعة

**الوصف**: يسمح للمستخدمين بإرسال عناصر جديدة إلى النظام الأساسي.

**كيفية العمل**:

1. يتنقل المستخدم لإرسال الصفحة
2. يملأ تفاصيل العنصر (الاسم والوصف وعنوان URL والشعار)
3. يختار الفئة والعلامات
4. يقدم للمراجعة
5. يتلقى المشرف إخطارا بتقديم جديد
6. يراجع المشرف ويوافق/يرفض
7. تظهر العناصر المعتمدة على المنصة

**حقول النموذج**:

- اسم العنصر (مطلوب)
- الوصف (مطلوب)
- عنوان URL لموقع الويب
- تحميل الشعار/الصورة
- اختيار الفئة
- اختيار العلامة
- البيانات الوصفية الإضافية

**حالات سير العمل**:

- المسودة ← في انتظار المراجعة ← تمت الموافقة عليها/الرفض

**الملفات الرئيسية**: `/app/[locale]/submit/`، `/app/api/admin/items/[id]/review/`

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

## نظام الاشتراك والدفع

**الوصف**: تحقيق الدخل من خلال الوصول القائم على الاشتراك أو الميزات المتميزة.

** مقدمي الخدمات المدعومة **:

- **Stripe**: إدارة الاشتراكات الكاملة، والفواتير، وبوابة العملاء
- **LemonSqueezy**: معالج دفع بديل مع الامتثال الضريبي

**كيفية العمل**:

1. الخطط المحددة في مزود الدفع (Stripe/LemonSqueezy)
2. يحدد المستخدمون الخطة في صفحة التسعير
3. إعادة التوجيه إلى الخروج مزود الدفع
4. يتعامل Webhook مع الدفع الناجح
5. سجل الاشتراك الذي تم إنشاؤه في قاعدة البيانات
6. يحصل المستخدم على إمكانية الوصول إلى الميزات المتميزة

**الملفات الرئيسية**: `/app/api/stripe/`، `/app/api/lemonsqueezy/`

[معرفة المزيد حول تكامل الدفع →](/الدفع)

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

## نظام الإخطار

**الوصف**: الإشعارات التي ينشئها النظام للأحداث المهمة.

**أنواع الإشعارات**:

- تعليقات جديدة على عناصر المستخدم
- تحديثات الاشتراك
- إعلانات المشرف
- الموافقة على السلعة/الرفض

**قنوات التسليم**:

- الإخطارات داخل التطبيق
- إشعارات البريد الإلكتروني (عبر إعادة الإرسال/Novu)
- إشعارات الدفع (اختياري)

**الملفات الرئيسية**: `/lib/services/notification.service.ts`، `/app/api/notifications/`

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

## تكامل إدارة علاقات العملاء (عشرون إدارة علاقات العملاء)

**الوصف**: مزامنة بيانات النظام الأساسي مع Twenty CRM لإدارة علاقات العملاء.

**الميزات**:

- إنشاء جهة اتصال تلقائية من تسجيلات المستخدم
- مزامنة أنشطة المستخدم وتفاعلاته
- تتبع الاشتراكات والمدفوعات
- رسم الخرائط الميدانية المخصصة
- المزامنة المستندة إلى Webhook

**الملفات الرئيسية**: `/lib/services/crm.service.ts`، `/app/api/webhooks/crm/`

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

## التدويل (i18n)

**الوصف**: دعم متعدد اللغات للمنصة.

**اللغات المدعومة**: أكثر من 13 لغة بما في ذلك الإنجليزية والفرنسية والإسبانية والصينية والألمانية والعربية (RTL) والمزيد.

**الميزات**:

- الكشف التلقائي عن اللغة
- التبديل المحلي القائم على عنوان URL
- دعم RTL للغة العربية
- تنسيق التاريخ/الرقم لكل لغة
- قواعد التعدد

**الملفات الرئيسية**: `/messages/`، `/lib/i18n/`، `/middleware.ts`

[معرفة المزيد عن التدويل →](/التدويل)

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

## لوحة تحكم المشرف

**الوصف**: مركز مركزي للمسؤولين لمراقبة النظام الأساسي وإدارته.

** أدوات لوحة التحكم **:

- إجمالي المستخدمين والعناصر والاشتراكات
- خلاصة الأنشطة الأخيرة
- الطلبات المعلقة
- الحالة الصحية للنظام
- نظرة عامة على التحليلات

** الميزات الرئيسية **:

- إحصاءات في الوقت الحقيقي
- إجراءات سريعة
- إشعارات النظام
- مقاييس الأداء

**الملفات الرئيسية**: `/app/[locale]/admin/dashboard/`

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

## إدارة العملاء

**الوصف**: الإدارة الإدارية لملفات تعريف العملاء.

**الميزات**:

- عرض جميع الملفات الشخصية للعملاء
- تحرير معلومات العميل
- ربط العملاء بالشركات
- عرض تقديمات العميل
- إدارة اشتراكات العملاء

**الملفات الرئيسية**: `/app/[locale]/admin/clients/`، `/app/api/admin/clients/`

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

## إدارة الإعدادات

**الوصف**: خيارات التكوين على مستوى النظام الأساسي.

**فئات الإعدادات**:

- **عام**: اسم الموقع ووصفه وشعاره
- **الميزات**: تمكين/تعطيل الميزات (الفئات، العلامات، التصويت، وما إلى ذلك)
- **البريد الإلكتروني**: تكوين SMTP، وقوالب البريد الإلكتروني
- **الدفع**: مفاتيح Stripe/LemonSqueezy API
- **التحليلات**: PostHog، تكوين Sentry
- **الأمان**: ReCAPTCHA، تحديد المعدل

**الملفات الرئيسية**: `/app/[locale]/admin/settings/`، `/lib/config/`

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

## ميزات إضافية

### قوالب البريد الإلكتروني

قوالب بريد إلكتروني قابلة للتخصيص من أجل:

- رسائل البريد الإلكتروني الترحيبية
- إعادة تعيين كلمة المرور
- التحقق من البريد الإلكتروني
- تأكيدات الاشتراك
- النشرة الإخبارية

[تعرف على المزيد حول قوالب البريد الإلكتروني →](/guides/email-templates)

### نظام الموضوع

موضوعات متعددة معدة مسبقًا:

- EverWorks (افتراضي)
- الشركات
- مادة
- مضحك

[تعرف على المزيد حول السمات →](/guides/theming)

### نظام الألوان الديناميكي

توليد لوحة الألوان تلقائيًا (ظلال من 50 إلى 950) من الألوان الأساسية.

[تعرف على المزيد حول الألوان الديناميكية →](/guides/dynamic-colors)

### اختبار الاستجابة

إرشادات الاختبار عبر الأجهزة وأفضل الممارسات.

[مزيد من المعلومات حول الاختبار →](/development/testing)

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

## الخطوات التالية

- [Tech Stack](./tech-stack) - اكتشف مكدس التكنولوجيا
- [نظرة عامة على الهندسة المعمارية](./overview) - فهم الهندسة المعمارية

## الموارد

- [إعداد التطوير](/development/local-setup) - قم بإعداد بيئتك
- [دليل النشر](/deployment/overview) - النشر إلى الإنتاج
- [وثائق واجهة برمجة التطبيقات](/development/api-documentation) - مرجع واجهة برمجة التطبيقات
