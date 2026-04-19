---
id: type-definitions
title: اكتب نظرة عامة على النظام
sidebar_label: تعريفات النوع
sidebar_position: 41
---

# اكتب نظرة عامة على النظام

يقوم القالب بمركزية تعريفات نوع TypeScript الخاصة به في `template/lib/types/`. يحتوي هذا الدليل على واجهات وأسماء مستعارة للنوع ومخططات التحقق من Zod ووحدات DTO للطلب/الاستجابة المستخدمة عبر المستودعات والخدمات ومسارات واجهة برمجة التطبيقات.

** دليل المصدر: ** `template/lib/types/`

---

## Directory Listing

| File | Purpose |
|------|---------|
| `item.ts` | Item data model, create/update/review requests, list options, status types |
| `user.ts` | Authentication user data, create/update requests, Zod validation schemas, list options |
| `role.ts` | Role data model, create/update requests, list options, role-with-count type |
| `tag.ts` | Tag data model, create/update requests, paginated list response |
| `category.ts` | Category data model with count, create/update requests, validation constants, list options |
| `comment.ts` | Comment data structures |
| `vote.ts` | Vote data structures |
| `client.ts` | Client profile types |
| `client-item.ts` | Client-facing item types |
| `profile.ts` | User profile types |
| `survey.ts` | Survey data structures |
| `location.ts` | Location/geography types |
| `sponsor-ad.ts` | Sponsor and advertisement types |
| `twenty-crm-config.types.ts` | Twenty CRM integration configuration types |
| `twenty-crm-entities.types.ts` | Twenty CRM entity model types |
| `twenty-crm-errors.types.ts` | Twenty CRM error handling types |
| `twenty-crm-sync.types.ts` | Twenty CRM synchronization types |

---

## أنواع المجال الأساسية

### أنواع العناصر (`item.ts`)

يعد نظام نوع العنصر هو الأكثر شمولاً، حيث يغطي دورة الحياة الكاملة لقائمة الدليل.

**أنواع المفاتيح:**

- **`ItemData`** - نموذج بيانات العنصر الأساسي مع حقول `id`، `name`، `slug`، `description`، `source_url`، `status`، `category`، `tags`، `collections`، `submitted_by`، `submitted_at`، `deleted_at`، والمزيد
- **`CreateItemRequest`** - DTO لإنشاء العنصر؛ يتطلب `id`، `name`، `slug`، `description`، `source_url`
- **`UpdateItemRequest`** - DTO جزئي لتحديثات العناصر؛ جميع الحقول اختيارية
- **`ReviewRequest`** - يحتوي على `status` (`'approved'` أو `'rejected'`) واختياري `review_notes`
- **`ItemListOptions`** - خيارات التصفية وترقيم الصفحات: `status`، `categories`، `tags`، `submittedBy`، `search`، `includeDeleted`، `sortBy`، `sortOrder`

### أنواع المستخدمين (`user.ts`)

أنواع المستخدمين على مستوى المصادقة مع مخططات التحقق من Zod.

**أنواع المفاتيح:**

- **`AuthUserData`** - يمثل سجل مستخدم تمت مصادقته (المعرف، البريد الإلكتروني، create_at، وما إلى ذلك)
- **`CreateUserRequest`** - البريد الإلكتروني وكلمة المرور لإنشاء المستخدم
- **`UpdateUserRequest`** - حقول التحديث الجزئي
- **`UserListOptions`** - خيارات ترقيم الصفحات والتصفية
- **`AuthUserListResponse`** - استجابة مرقّمة مع `users`، `total`، `page`، `limit`، `totalPages`
- **`userValidationSchema`** - مخطط Zod للتحقق الكامل من صحة إنشاء المستخدم
- **`updateUserValidationSchema`** - مخطط Zod للتحقق الجزئي من صحة تحديث المستخدم

### أنواع الأدوار (`role.ts`)

أنواع بيانات الدور لنظام RBAC.

**أنواع المفاتيح:**

- **`RoleData`** - سجل الدور مع `id`، `name`، `description`، `permissions`، `isDefault`، `status`، الطوابع الزمنية
- **`CreateRoleRequest`** - الحقول المطلوبة لإنشاء دور جديد
- **`UpdateRoleRequest`** - تحديث جزئي للدور
- **`RoleListOptions`** - خيارات التصفية بما في ذلك `status` والبحث وترقيم الصفحات
- **`RoleWithCount`** - يمتد `RoleData` مع `userCount` لعرض المسؤول

### أنواع العلامات (`tag.ts`)

أنواع بيانات العلامات لنظام وضع العلامات/وضع العلامات.

**أنواع المفاتيح:**

- **`TagData`** - سجل العلامات باستخدام `id`، `name`، وبيانات التعريف الاختيارية
- **`CreateTagRequest`** - يتطلب `id` و`name`
- **`UpdateTagRequest`** - تحديث جزئي للعلامة
- **`TagListResponse`** - قائمة علامات مرقّمة مع `tags`، `total`، `page`، `limit`، `totalPages`

### أنواع الفئات (`category.ts`)

أنواع بيانات الفئة للتصنيف التنظيمي.

**أنواع المفاتيح:**

- **`CategoryData`** - سجل الفئة مع `id`، `name`، `description`، والبيانات الوصفية
- **`CategoryWithCount`** - يمتد `CategoryData` مع عدد العناصر
- **`CreateCategoryRequest`** - يتطلب `id`، `name`، اختياري `description`
- **`UpdateCategoryRequest`** - تحديث جزئي للفئة (يتطلب `id`)
- **`CategoryListOptions`** - خيارات التصفية والفرز وترقيم الصفحات
- **`CATEGORY_VALIDATION`** - ثوابت للتحقق من صحة طول الحقل (الاسم الأدنى/الحد الأقصى، الوصف الأقصى، قيود المعرف)

---

## Integration Types

### Twenty CRM Types

Four files define the type system for the Twenty CRM integration:

| File | Contents |
|------|----------|
| `twenty-crm-config.types.ts` | Configuration types for CRM connection settings |
| `twenty-crm-entities.types.ts` | Entity models mapping to CRM objects |
| `twenty-crm-errors.types.ts` | Error types for CRM API error handling |
| `twenty-crm-sync.types.ts` | Synchronization state and operation types |

---

## اصطلاحات نمط الكتابة

### طلب/استجابة DTOs

تتبع قاعدة التعليمات البرمجية نمطًا ثابتًا لكائنات نقل البيانات:

- **`Create[Entity]Request`** - يحتوي على كافة الحقول المطلوبة للإنشاء
- **`Update[Entity]Request`** - نوع جزئي حيث تكون معظم الحقول اختيارية؛ يتطلب عادةً `id`
- **`[Entity]ListOptions`** - معلمات التصفية والفرز وترقيم الصفحات
- **`[Entity]ListResponse`** - استجابة مرقّمة مع `items`، `total`، `page`، `limit`، `totalPages`

### مخططات التحقق من الصحة

تتواجد مخططات Zod في موقع مشترك مع الأنواع المقابلة لها:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

تستخدم المستودعات `.parse()` أو `.pick()` في هذه المخططات قبل تنفيذ الطفرات.

### ثوابت التحقق

بالنسبة للكيانات المدعومة من Git (الفئات والمجموعات)، يتم تصدير ثوابت التحقق ككائنات عادية:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

يتم الرجوع إليها في طرق التحقق من صحة المستودع.

---

## Type Relationships

```
ItemData
  ├── references CategoryData (via category field)
  ├── references TagData (via tags field)
  ├── references Collection (via collections field)
  └── referenced by ClientDashboardRepository

AuthUserData
  ├── references RoleData (via role assignments)
  └── referenced by UserRepository

RoleData
  ├── contains Permission[] (from permissions/definitions)
  └── referenced by RoleRepository

CategoryData
  └── referenced by items (category field)

TagData
  └── referenced by items (tags field)
```

---

## إرشادات الاستخدام

1. **قم دائمًا باستيراد الأنواع من `@/lib/types/`** بدلاً من إعادة الإعلان عنها في المكونات أو مسارات واجهة برمجة التطبيقات
2. **استخدم طلبات DTO** للتحقق من صحة إدخال معالج واجهة برمجة التطبيقات، وليس نموذج البيانات الكامل
3. **استخدم مخططات Zod** حيثما كان ذلك متاحًا (أنواع المستخدمين) للتحقق من صحة وقت التشغيل
4. **استخدم ثوابت التحقق من الصحة** (الفئات والمجموعات) لقيود الحقل المتسقة عبر الواجهة الأمامية والخلفية
5. **قم بتوسيع الأنواع محليًا** فقط عندما تحتاج إلى أنواع مشتقة خاصة بالمكونات والتي لا تنتمي إلى الطبقة المشتركة

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
