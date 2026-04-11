---
id: voting-comments-deep-dive
title: التصويت والتعليقات الغوص العميق
sidebar_label: التصويت والتعليقات الغوص العميق
sidebar_position: 36
---

# التصويت والتعليقات الغوص العميق

يغطي هذا البحث العميق الآليات الداخلية لأنظمة التصويت والتعليق، بما في ذلك خوارزميات التحديث المتفائلة، واستراتيجيات إدارة ذاكرة التخزين المؤقت، وتجميع التصنيف، وتنسيق الأحداث عبر المكونات، وسير عمل الإشراف الإداري.

## نظرة عامة على الهندسة المعمارية

```
hooks/
  use-item-vote.ts           # Vote hook with optimistic mutations and cache utilities
  use-comments.ts            # Comment CRUD hook with rating integration
  use-admin-comments.ts      # Admin moderation hook with pagination

app/api/items/[id]/
  votes/route.ts             # GET/POST/DELETE vote endpoints
  comments/route.ts          # GET/POST comment endpoints
  comments/[commentId]/route.ts  # PUT/DELETE single comment
  comments/rating/route.ts   # POST/PUT/GET rating endpoints

lib/db/schema.ts             # votes and comments table definitions
```

## النظام الداخلي لنظام التصويت

### خطاف useItemVote

يدير الخطاف حالة التصويت لعنصر واحد مع دعم كامل للتحديث المتفائل:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### آلة حالة التصويت

تنفذ الوظيفة `handleVote` آلة حالة قائمة على التبديل:

| الحالة الحالية | العمل | النتيجة | صافي التغيير |
|--------------|--------|------------|---------|
| لا يوجد تصويت | انقر فوق | التصويت لصالح | +1 |
| لا يوجد تصويت | انقر للأسفل | التصويت السلبي | -1 |
| تم التصويت عليه | انقر فوق | إزالة التصويت (تبديل) | -1 |
| تم التصويت عليه | انقر للأسفل | التبديل إلى التصويت السلبي | -2 |
| تم التصويت ضده | انقر للأسفل | إزالة التصويت (تبديل) | +1 |
| تم التصويت ضده | انقر فوق | قم بالتبديل إلى التصويت الإيجابي | +2 |

عندما يتطابق التصويت الحالي للمستخدم مع النوع المطلوب، يستدعي الخطاف `unvote()` (DELETE). وإلا فإنه يستدعي 2  (POST).

### حساب العد المتفائل

يحسب التحديث المتفائل تفاضل العدد دون انتظار الخادم:

```ts
onMutate: async (type) => {
  const previousVotes = queryClient.getQueryData(['item-votes', itemId]);
  queryClient.setQueryData(['item-votes', itemId], (old) => {
    if (!old) return { count: type === 'up' ? 1 : -1, userVote: type };
    const countDiff = old.userVote === type ? -1
      : old.userVote === null ? 1
      : 2; // switching direction
    return {
      count: old.count + (type === 'up' ? countDiff : -countDiff),
      userVote: old.userVote === type ? null : type
    };
  });
  return { previousVotes };
},
```

يتعامل الحساب 0 مع ثلاث حالات: التبديل إلى وضع الإيقاف (طرح 1)، والتصويت الجديد (إضافة 1)، وتبديل الاتجاه (إضافة 2 للتأرجح الكامل).

### بوابة التوثيق

يتم عرض نموذج تسجيل دخول مشروط للمستخدمين غير المصادقين الذين يحاولون التصويت بدلاً من تلقي خطأ:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

يتم اكتشاف الخطأ بواسطة معالج الطفرة، الذي يتحقق من رسالة المصادقة ويمنع نخب الخطأ.

### تكوين الاستعلام

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### أدوات ذاكرة التخزين المؤقت للتصويت

يوفر الخطاف `useVoteCache` عمليات ذاكرة التخزين المؤقت عبر المكونات:

```ts
function useVoteCache() {
  return {
    invalidateAllVotes,    // Invalidate all vote queries
    invalidateItemVotes,   // Invalidate votes for a specific item
    clearVoteCache,        // Remove all vote data from cache
    prefetchItemVotes,     // Pre-fetch votes for an item (e.g., on hover)
  };
}
```

## تعليقات النظام الداخلي

### خطاف الاستخدام للتعليقات

يوفر الخطاف عمليات CRUD كاملة مع دعم التصنيف المتكامل:

```ts
interface CreateCommentData {
  content: string;
  itemId: string;
  rating: number;
}

interface UpdateCommentData {
  commentId: string;
  content?: string;
  rating?: number;
}
```

### قيمة الإرجاع

| عقار | اكتب | الوصف |
|----------|------|-------------|
| `comments` | `CommentWithUser[]` | التعليقات مع بيانات المستخدم المملوءة |
| `isPending` | `boolean` | صحيح أثناء الجلب الأولي |
| 4ـ | 5 ــ | قم بإنشاء تعليق جديد |
| 6ـ | `(data) => Promise` | تحرير تعليق موجود |
| 8ـ | `(id) => Promise` | إزالة تعليق |
| `rateComment` | `(data) => void` | قيم التعليق |
| ‹‹١٢› | 13 ــ | تحديث تقييم موجود |
| 14 ــ | `number` | التقييم الإجمالي للعنصر |

### نظام الأحداث عبر المكونات

يرسل نظام التعليق أحداث DOM مخصصة للتنسيق بين المكونات التي لا تشترك في مفاتيح ذاكرة التخزين المؤقت لـ React Query:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

يسمح هذا لمكونات مثل رأس تفاصيل العنصر (الذي يعرض عدد التعليقات) بالتفاعل مع تغييرات التعليق دون اقترانها مباشرة باستعلام التعليقات.

### تجميع التقييم

التعليقات والتقييمات متكاملة بإحكام. بعد أي تغيير في التعليق (إنشاء، تحديث، حذف)، يفرض الخطاف إعادة تصنيف العنصر:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

ويضمن ذلك تحديث عرض التصنيف بالنجوم فورًا بعد قيام المستخدم بإرسال مراجعة أو تحريرها.

### استقرار الاستعلام

يستخدم استعلام التعليقات إعدادات التحديث المحافظة لمنع وميض واجهة المستخدم:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## الإشراف الإداري

### خطاف useAdminComments

يوفر ربط الإشراف الإداري إدارة التعليقات المرقّمة:

```ts
function useAdminComments({ page, limit, search }) {
  return {
    comments: AdminCommentItem[],
    totalComments: number,
    totalPages: number,
    isDeleting: string | null,  // ID of comment being deleted
    deleteComment: (id: string) => Promise<boolean>,
  };
}
```

### سير عمل الإشراف

1. ينتقل المشرف إلى صفحة إدارة التعليقات.
2. يتم عرض التعليقات مع البحث وترقيم الصفحات.
3. تتتبع الحالة `isDeleting` التعليق الذي تتم إزالته، مما يؤدي إلى تعطيل صفه.
4. يؤدي الحذف إلى إرسال إشعار إلى مؤلف التعليق عبر `NotificationService` .

## نقاط نهاية واجهة برمجة التطبيقات

| الطريقة | نقطة النهاية | الوصف |
|--------|----------|-------------|
| احصل على | `/api/items/:id/votes` | جلب عدد الأصوات وتصويت المستخدم |
| مشاركة | `/api/items/:id/votes` | الإدلاء بالتصويت أو تغييره |
| حذف | 4ـ | إزالة التصويت |
| احصل على | 5 ــ | جلب التعليقات مع بيانات المستخدم |
| مشاركة | 6ـ | قم بإنشاء تعليق جديد |
| ضع | `/api/items/:id/comments/:commentId` | تحديث تعليق |
| حذف | 8ـ | احذف تعليق |
| مشاركة | `/api/items/:id/comments/rating` | قيم التعليق |
| ضع | `/api/items/:id/comments/rating` | تحديث تقييم التعليق |
| احصل على | `/api/items/:id/comments/rating` | الحصول على تصنيف البند الإجمالي |

## ميزة تكامل العلم

يحترم كل من التصويت والتعليقات العلامات المميزة:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

عندما لا يتم تكوين قاعدة البيانات، يتم تعطيل هذه الميزات تلقائيًا.

## إمكانية الوصول

- تستخدم أزرار التصويت `aria-pressed` للإشارة إلى حالة التصويت الحالية.
- يتم التركيز على نموذج تسجيل الدخول الناتج عن محاولات التصويت غير المصادق عليها.
- تستخدم نماذج التعليق الارتباطات ورسائل التحقق المناسبة.
- يدعم مكون التصنيف بالنجوم التنقل عبر لوحة المفاتيح باستخدام مفاتيح الأسهم.
- تتضمن جداول الإشراف الإداري مؤشرات الحالة على مستوى الصف والإجراءات التي يمكن الوصول إليها من خلال لوحة المفاتيح.
- توفر حالات التحميل والخطأ السمات `aria-busy` و `role="alert"` على التوالي.

## الوثائق ذات الصلة

- [نظرة عامة على التصويت والتعليقات](/docs/template/features/voting-comments) -- نظرة عامة على الميزات عالية المستوى
- [مكونات تفاصيل العنصر](/docs/template/components/item-detail-components) -- مكان ظهور الأصوات والتعليقات
- [نظام الإشعارات](/docs/template/features/notification-system) -- الإشعارات المثارة بالتعليق
- [مكونات لوحة المعلومات](/docs/template/components/dashboard-components) -- تحليلات التصويت والتعليقات
