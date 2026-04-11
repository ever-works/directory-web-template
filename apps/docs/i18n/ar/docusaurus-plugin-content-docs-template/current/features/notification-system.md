---
id: notification-system
title: نظام الإخطار الغوص العميق
sidebar_label: نظام الإخطار
sidebar_position: 34
---

# نظام الإخطار الغوص العميق

يوفر القالب نظام إعلام داخل التطبيق مدعومًا بـ PostgreSQL. يتم إنشاء الإشعارات بواسطة الخدمات من جانب الخادم ويتم استهلاكها من خلال REST API، بشكل أساسي من خلال لوحة تحكم المسؤول. يدعم النظام أنواعًا متعددة من الإشعارات والعمليات المجمعة وتعريفات الأنواع القابلة للتوسيع.

## نظرة عامة على الهندسة المعمارية

```
lib/db/schema.ts                    # notifications table definition
lib/services/notification.service.ts # NotificationService with convenience methods

app/api/admin/notifications/
  route.ts                           # GET (list) and POST (create) endpoints
  mark-all-read/route.ts             # POST mark all as read
  [id]/read/route.ts                 # PATCH mark single as read

components/admin/
  admin-notifications.tsx            # Notification dropdown UI
  admin-notification-stats.tsx       # Notification count badges
```

## مخطط قاعدة البيانات

يتم تخزين الإخطارات في الجدول `notifications` :

```ts
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'),              // JSON string for extra payload
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIndex: index('notifications_user_idx').on(table.userId),
  typeIndex: index('notifications_type_idx').on(table.type),
  isReadIndex: index('notifications_is_read_idx').on(table.isRead),
  createdAtIndex: index('notifications_created_at_idx').on(table.createdAt),
}));
```

### تصميم المخطط

- ** `type` عمود** - سلسلة حرة تصنف الإشعارات. لا يتم فرضه بواسطة التعداد، مما يسمح بأنواع جديدة دون عمليات ترحيل.
- ** عمود واحد ** - يخزن سياقًا إضافيًا كسلسلة JSON. يتم التحليل عند القراءة للوصول إلى معرفات العناصر أو محتوى التعليق أو المعلومات الخاصة بالحدث.
- ** `isRead` / `readAt` ** -- علامة منطقية للتعداد السريع غير المقروء بالإضافة إلى طابع زمني للتدقيق.
- **أربعة فهارس** - تغطي بحث المستخدم، وتصفية النوع، وتصفية غير المقروءة، والقائمة الزمنية.

## أنواع الإخطارات

يستخدم النظام معرفات النوع المستندة إلى السلسلة. تشمل الأنواع المضمنة ما يلي:

| اكتب | الزناد | المستلم النموذجي |
|------|---------|------------------|
| 4ـ | يوافق المشرف على العنصر المقدم | مقدم السلعة |
| 5 ــ | المشرف يرفض العنصر المقدم | مقدم السلعة |
| 6ـ | شخص ما يعلق على عنصر المستخدم | مالك السلعة |
| `comment_reported` | تم وضع علامة على التعليق للمراجعة | المشرف |
| 8ـ | تم وضع علامة على عنصر للمراجعة | المشرف |
| `user_registered` | مستخدم جديد يسجل | المشرف |
| `payment_failed` | فشلت محاولة الدفع | المستخدم المتأثر |
| `system_alert` | تحذير أو إشعار على مستوى النظام | المشرف |

### إضافة أنواع مخصصة

1. اختر سلسلة من النوع الوصفي (على سبيل المثال، `survey_response_received` ).
2. أضف طريقة ملائمة إلى 13 تعمل على إنشاء الحمولة الصحيحة.
3. اتصل بالطريقة من مسار أو خدمة واجهة برمجة التطبيقات ذات الصلة.
4. قم بتحديث القائمة المنسدلة لإشعارات المسؤول بشكل اختياري لعرض رمز مخصص.

لا يلزم ترحيل قاعدة البيانات نظرًا لأن `type` عبارة عن عمود نصي ذو شكل حر.

## خدمة الإخطار

تقع الخدمة في `lib/services/notification.service.ts` ، وتوفر طرقًا ملائمة لإنشاء إشعارات من رمز جانب الخادم:

```ts
class NotificationService {
  static async create(data: CreateNotificationData);
  static async createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy);
  static async createCommentReportedNotification(adminUserId, commentId, content, reportedBy);
  static async createItemReportedNotification(adminUserId, itemId, itemName, reportedBy);
  static async createUserRegisteredNotification(adminUserId, userName, userEmail);
  static async createPaymentFailedNotification(userId, subscriptionId, errorMessage);
  static async createSystemAlertNotification(adminUserId, title, message);
}
```

تقوم كل طريقة ملائمة ببناء الحمولة الصحيحة 0 و1 و2 و3 قبل التفويض إلى الطريقة العامة 4.

### الاستخدام

```ts
import { NotificationService } from '@/lib/services/notification.service';

// After approving an item
await NotificationService.createItemSubmissionNotification(
  adminUserId, item.id, item.name, item.submittedBy
);

// System-level alert
await NotificationService.createSystemAlertNotification(
  adminUserId, 'Database Warning', 'Connection pool reaching capacity'
);
```

## نقاط نهاية واجهة برمجة التطبيقات

تتطلب جميع نقاط نهاية الإشعارات مصادقة المسؤول.

### الحصول على /api/admin/notifications

استرداد أحدث 50 إشعارًا للمسؤول المعتمد، مع ترتيب الأحدث أولاً. إرجاع الإشعارات وعدد الرسائل غير المقروءة في استجابة واحدة.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

يستخدم عدد غير المقروء علامة منفصلة 0 مع 1 لتحقيق الكفاءة.

### نشر /api/admin/notifications

إنشاء إشعار جديد لمستخدم معين.

| المجال | مطلوب | الوصف |
|-------|----------|-------------|
| `type` | نعم | معرف فئة الإخطار |
| `title` | نعم | نص عنوان قصير |
| 4ـ | نعم | نص أساسي |
| 5 ــ | نعم | معرف المستخدم المستلم |
| 6ـ | لا | حمولة إضافية (مقيدة تلقائيًا) |

### POST /api/admin/notifications/mark-all-read

وضع علامة على جميع الإشعارات غير المقروءة للمسؤول الحالي كمقروءة. يضبط `isRead = true` و `readAt` على الطابع الزمني الحالي في تحديث دفعة واحدة.

### التصحيح /api/admin/notifications/[id]/read

وضع علامة على إشعار واحد كمقروء بواسطة المعرف.

## تكامل لوحة تحكم المشرف

يعرض رأس المسؤول رمز الجرس مع شارة عدد غير مقروءة. مكون القائمة المنسدلة:

1. جلب الإخطارات من نقطة نهاية GET.
2. يعرض كل إشعار بأيقونات خاصة بالنوع وترميز لوني.
3. وضع علامة على الإشعارات الفردية كمقروءة عند النقر.
4. يوفر الإجراء المجمع "وضع علامة على الكل كمقروء".
5. استطلاعات الرأي على جهاز توقيت أو التحديث على التنقل المسؤول.

## اعتبارات في الوقت الحقيقي

يستخدم التطبيق الحالي التحديث القائم على الاستقصاء. بالنسبة للتحديثات في الوقت الفعلي، تدعم البنية نقاط الامتداد:

- **الأحداث المرسلة من الخادم** - أضف نقطة نهاية SSE التي تقوم ببث الإشعارات الجديدة.
- **WebSocket** - يتكامل مع موفر WebSocket للاتصال ثنائي الاتجاه.
- **الفاصل الزمني للاستقصاء** - قابل للتعديل من خلال مؤقت تحديث مكون إشعارات المسؤول.

## تكامل البريد الإلكتروني

يركز نظام الإشعارات على الإشعارات داخل التطبيق. تتم معالجة إشعارات البريد الإلكتروني الصادر بشكل منفصل من خلال خدمة البريد الإلكتروني (Resend/Novu)، ولكنها تشترك في نفس نقاط التشغيل. عند إنشاء إشعار عبر `NotificationService` ، يمكن لرمز الاتصال اختياريًا تشغيل بريد إلكتروني في نفس العملية.

## هيكل حمولة البيانات

يخزن العمود 10 سلاسل JSON ذات سياق خاص بالحدث:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

يسمح هذا المخطط المرن لمقدمي الإشعارات بالارتباط العميق بالصفحات ذات الصلة وعرض المعلومات السياقية.

## إمكانية الوصول

- تستخدم شارة رمز الجرس `aria-label` للإعلان عن عدد الرسائل غير المقروءة لقارئات الشاشة.
- عناصر الإشعارات الموجودة في القائمة المنسدلة قابلة للتركيز والتنقل عبر لوحة المفاتيح.
- الرموز الخاصة بالنوع تكون مزخرفة ( `aria-hidden="true"` ) مع تسميات نصية توفر السياق.
- يوفر الزر "وضع علامة على الكل كمقروء" تعليقات واضحة عبر إشعار الخبز المحمص.
- تستخدم الطوابع الزمنية التنسيق النسبي ("منذ ساعتين") مع التاريخ الكامل في السمات `title` .

## الوثائق ذات الصلة

- [مكونات الإدارة](/docs/template/components/admin-components) -- واجهة مستخدم إشعار المسؤول
- [مكونات لوحة المعلومات](/docs/template/components/dashboard-components) -- إحصائيات الإشعارات
- [التقارير والإشراف](/docs/template/features/reports-moderation) -- الإشعارات المحفزة للتقرير
- [التصويت والتعليقات](/docs/template/features/voting-comments) -- الإشعارات المحفزة للتعليق
