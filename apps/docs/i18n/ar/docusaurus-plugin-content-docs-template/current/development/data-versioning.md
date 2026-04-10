---
id: data-versioning
title: نظام عرض إصدار البيانات
sidebar_label: إصدارات البيانات
sidebar_position: 6
---

# نظام عرض إصدار البيانات

يتضمن Ever Works نظام إصدار بيانات يُظهر للمستخدمين الإصدار الحالي من البيانات التي يشاهدونها، مما يوفر الشفافية حول حداثة المحتوى.

## نظرة عامة

يوفر النظام:
- 📊 **عرض الإصدار في الوقت الفعلي** - يُظهر الإصدار الحالي لمستودع البيانات
- 🔄 **تحديث تلقائي** - يحدّث معلومات الإصدار دورياً
- 🎨 **متغيرات متعددة** - عروض الشارة والـ inline والتفصيلي
- 💡 **تفاصيل في تلميح الأداة** - مرر الماوس للحصول على معلومات شاملة
- ⚡ **دعم ISR** - يعمل مع التجديد الساكن التدريجي
- 🛡️ **معالجة الأخطاء** - تراجع رشيق عند عدم التوفر

## البنية المعمارية

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## المكونات

### VersionDisplay

المكوّن الرئيسي لعرض معلومات الإصدار.

```tsx
import { VersionDisplay } from "@/components/version";

// عرض inline أساسي
<VersionDisplay variant="inline" />

// متغير الشارة
<VersionDisplay variant="badge" />

// عرض تفصيلي مع معلومات إضافية
<VersionDisplay variant="detailed" showDetails={true} />
```

**الخصائص**:
- `variant`: `"inline" | "badge" | "detailed"` - أسلوب العرض
- `showDetails`: `boolean` - عرض المعلومات الموسّعة (المتغير التفصيلي فقط)
- `className`: `string` - فئات CSS إضافية
- `refreshInterval`: `number` - فترة التحديث التلقائي بالمللي ثانية (الافتراضي: 5 دقائق)

### VersionTooltip

مكوّن غلاف يضيف تلميح أداة مع معلومات إصدار تفصيلية.

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**الميزات**:
- يُظهر هاش الـ commit والتاريخ
- يعرض رسالة الـ commit
- يُظهر معلومات المؤلف
- روابط إلى المستودع

### خطاف useVersionInfo

خطاف مخصص لإدارة معلومات الإصدار مع التخزين المؤقت والتحديث التلقائي.

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 دقائق
  retryOnError: true,
  retryDelay: 10000
});
```

**يُرجع**:
- `versionInfo`: كائن بيانات الإصدار
- `loading`: حالة التحميل
- `error`: حالة الخطأ
- `refetch`: دالة التحديث اليدوي

## نقطة نهاية API

### GET /api/version

يُرجع معلومات الإصدار الحالي لمستودع البيانات.

**الاستجابة**:
```json
{
  "commit": "abc1234",
  "date": "2024-01-01T12:00:00.000Z",
  "message": "Update data items",
  "author": "Developer Name",
  "repository": "https://github.com/owner/repo",
  "lastSync": "2024-01-01T12:05:00.000Z"
}
```

**الميزات**:
- مزامنة تلقائية للمستودع قبل الجلب
- رؤوس تخزين مؤقت مناسبة للأداء الأمثل
- دعم ETag لتخزين مؤقت فعّال
- معالجة الأخطاء مع رموز حالة HTTP المناسبة

**رؤوس التخزين المؤقت**:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## الإعداد

### متغيرات البيئة

```env
# عنوان URL لمستودع البيانات
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# رمز GitHub للمستودعات الخاصة (اختياري)
GH_TOKEN=ghp_your_github_token_here

# فترة مزامنة المستودع (اختياري، الافتراضي: 5 دقائق)
REPO_SYNC_INTERVAL=300000
```

### استراتيجية التخزين المؤقت

#### التخزين المؤقت من جانب العميل
- **المدة**: دقيقة واحدة
- **الاستراتيجية**: stale-while-revalidate
- **التحديث**: تحديثات خلفية تلقائية

#### التخزين المؤقت من جانب الخادم
- **المدة**: 60 ثانية
- **الاستراتيجية**: s-maxage مع إعادة التحقق
- **ETag**: مبني على هاش الـ commit

## أمثلة الاستخدام

### شارة الإصدار في التذييل

```tsx
// components/footer/Footer.tsx
import { VersionDisplay } from "@/components/version";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <p>© 2024 Ever Works</p>
        <VersionDisplay variant="badge" />
      </div>
    </footer>
  );
}
```

### لوحة الإدارة

```tsx
// app/admin/dashboard/page.tsx
import { VersionDisplay } from "@/components/version";

export default function AdminDashboard() {
  return (
    <div>
      <h1>لوحة الإدارة</h1>
      <VersionDisplay 
        variant="detailed" 
        showDetails={true}
        refreshInterval={60000} // دقيقة واحدة
      />
    </div>
  );
}
```

### تنفيذ مخصص

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

export function CustomVersionDisplay() {
  const { versionInfo, loading, error, refetch } = useVersionInfo();

  if (loading) return <div>جارٍ تحميل الإصدار...</div>;
  if (error) return <div>الإصدار غير متاح</div>;

  return (
    <div>
      <p>إصدار البيانات: {versionInfo.commit.substring(0, 7)}</p>
      <p>تم التحديث: {new Date(versionInfo.date).toLocaleDateString()}</p>
      <button onClick={refetch}>تحديث</button>
    </div>
  );
}
```

## متغيرات العرض

### متغير Inline

عرض نص مضغوط مناسب للتذاييل أو الأشرطة الجانبية.

```tsx
<VersionDisplay variant="inline" />
// الناتج: "Data v.abc1234 • تم التحديث منذ ساعتين"
```

### متغير الشارة

شارة بشكل حبة دواء مع أيقونة، مثالية للرؤوس أو التنقل.

```tsx
<VersionDisplay variant="badge" />
// الناتج: [🔄 v.abc1234]
```

### المتغير التفصيلي

عرض شامل مع جميع معلومات الإصدار.

```tsx
<VersionDisplay variant="detailed" showDetails={true} />
// الناتج: بطاقة تحتوي على الـ commit والتاريخ والرسالة والمؤلف ورابط المستودع
```

## أفضل الممارسات

### 1. الموضع
- **التذييل**: استخدم متغير inline أو الشارة
- **لوحات الإدارة**: استخدم المتغير التفصيلي
- **الرؤوس**: استخدم متغير الشارة
- **تلميحات الأدوات**: لفّ أي متغير بـ VersionTooltip

### 2. فترات التحديث
- **الصفحات العامة**: 5-10 دقائق
- **صفحات الإدارة**: 1-2 دقائق
- **لوحات البيانات في الوقت الفعلي**: 30 ثانية

### 3. معالجة الأخطاء
- قدّم دائماً واجهة مستخدم احتياطية
- سجّل الأخطاء للمراقبة
- اعرض رسائل سهلة الفهم للمستخدمين

### 4. الأداء
- استخدم مدد تخزين مؤقت مناسبة
- نفّذ stale-while-revalidate
- تجنب استدعاءات API المفرطة

## استكشاف الأخطاء وإصلاحها

### الإصدار لا يتحدث

**المشكلة**: معلومات الإصدار لا تتجدد

**الحل**: تحقق من فترة التحديث وإعدادات التخزين المؤقت

```tsx
// فرض التحديث الفوري
const { refetch } = useVersionInfo();
refetch();
```

### أخطاء API

**المشكلة**: `/api/version` يُرجع أخطاء

**الحل**: تحقق من متغيرات البيئة والوصول إلى المستودع

```bash
# Check environment variables
echo $DATA_REPOSITORY
echo $GH_TOKEN

# Test repository access
git ls-remote $DATA_REPOSITORY
```

### بطء التحميل

**المشكلة**: مكوّن الإصدار يتحمّل ببطء

**الحل**: حسّن التخزين المؤقت وقلّل تكرار التحديث
