---
id: company-profiles
title: ملفات الشركة
sidebar_label: ملفات الشركة
sidebar_position: 16
---

#ملفات الشركة

يتضمن قالب Ever Works نظامًا كاملاً لإدارة الشركة يسمح للمسؤولين بإنشاء وإدارة وربط الشركات بالعناصر المدرجة. يدعم النظام إلغاء البيانات المكررة بشكل ذكي من خلال مطابقة النطاق والاسم، والقائمة المرقّمة مع البحث، والعلاقة الفردية بين العناصر والشركات.

## نظرة عامة على الهندسة المعمارية

| مكون | المسار | الغرض |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | ربط العميل لارتباطات شركة السلعة |
| `company.service.ts` | `lib/services/company.service.ts` | منطق الأعمال لإنشاء الشركة وإلغاء البيانات المكررة |
| 4ـ | 5 ــ | استعلامات قاعدة البيانات لشركة CRUD والجمعيات |
| 6ـ | `types/company.ts` | تعريفات نوع TypeScript |
| 8ـ | `lib/validations/company.ts` | مخططات التحقق من صحة Zod |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | القائمة المنسدلة لمحدد الشركة |
| ‹‹١٢› | 13 ــ | إنشاء/تحرير نموذج الشركة |
| 14 ــ | `components/admin/companies/company-stats.tsx` | عرض إحصائيات الشركة |
| 16 ــ | `components/admin/items/item-company-manager.tsx` | إدارة اقترانات شركة البند |

## نموذج بيانات الشركة

```tsx
// types/company.ts
type Company = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  slug: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};
```

| المجال | الوصف |
|---|---|
| `id` | المعرف الفريد (UUID) |
| `name` | اسم العرض للشركة |
| `website` | عنوان URL الكامل للموقع |
| `domain` | المجال الطبيعي (على سبيل المثال، `example.com` ) لإلغاء البيانات المكررة |
| 5 ــ | سبيكة ثابتة آمنة لعنوان URL تم إنشاؤها من الاسم |
| 6ـ | الحالة النشطة أو غير النشطة |

## خدمة الشركة

يوفر 7 منطق الأعمال لإنشاء الشركة مع ميزة إلغاء البيانات المكررة المضمنة.

### استراتيجية إلغاء البيانات المكررة

تستخدم الخدمة إستراتيجية بحث من ثلاث خطوات قبل إنشاء شركة جديدة:

1. **البحث عن النطاق** (أساسي) -- الأكثر موثوقية لتحديد هوية الشركة نفسها
2. **البحث عن الاسم** (احتياطي) - المطابقة التامة لاسم الشركة
3. **إنشاء جديد** -- فقط في حالة فشل كلا عمليتي البحث

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### الإنشاء من بيانات العميل

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### استخراج النطاق

تقوم الخدمة بتطبيع عناوين URL لاستخراج المجالات النظيفة:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### جيل سبيكة

يتم إنشاء البزاقات تلقائيًا من أسماء الشركات:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## استعلامات قاعدة البيانات

توفر الوحدة 0 عمليات CRUD شاملة:

### شركة الخام

| وظيفة | الوصف |
|---|---|
| `createCompany(data)` | إنشاء شركة جديدة |
| `getCompanyById(id)` | احصل على الشركة عن طريق UUID |
| `getCompanyBySlug(slug)` | احصل على الشركة عن طريق سبيكة (غير حساسة لحالة الأحرف) |
| 4ـ | احصل على الشركة حسب المجال (غير حساس لحالة الأحرف) |
| 5 ــ | احصل على الشركة بالاسم الدقيق (غير حساس لحالة الأحرف) |
| 6ـ | تحديث حقول الشركة |
| `deleteCompany(id)` | حذف شركة |

### قائمة الشركة

```tsx
import { listCompanies } from '@/lib/db/queries/company.queries';

const result = await listCompanies({
  page: 1,
  limit: 10,
  search: 'acme',           // Searches name and domain
  status: 'active',
  sortBy: 'createdAt',      // 'name' | 'createdAt' | 'updatedAt'
  sortOrder: 'desc'
});

// Returns: { companies, total, page, totalPages, limit, activeCount, inactiveCount }
```

### ارتباطات شركة السلعة

يمكن ربط كل عنصر بشركة واحدة بالضبط. تتم إدارة الارتباط من خلال جدول الوصلات `itemsCompanies` :

| وظيفة | الوصف |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | رابط Idempotent (إنشاء أو تحديث) |
| `unlinkItemFromCompany(itemSlug)` | إلغاء الارتباط العاجز |
| `getCompanyByItemSlug(itemSlug)` | احصل على شركة لعنصر |
| 4ـ | قائمة العناصر التابعة لشركة |
| 5 ــ | تحقق مما إذا كان العنصر لديه شركة |
| 6ـ | قائمة الشركات مع عدد العناصر الخاصة بهم |

الدالة 7 غير فعالة:
- في حالة عدم وجود جمعية، يتم إنشاء واحدة
- إذا كانت نفس الشركة مرتبطة بالفعل، فإنها تقوم بإرجاع الارتباط الحالي
- إذا تم ربط شركة مختلفة، فسيتم تحديث الارتباط

## الخطاف 8

يوفر الخطاف من جانب العميل إدارة شركة مدعومة من React Query للعناصر:

```tsx
import { useItemCompany } from '@/hooks/use-item-company';

function ItemCompanyManager({ itemSlug }) {
  const {
    company,       // Current company or null
    isLoading,     // Loading state
    isAssigning,   // Assignment in progress
    isRemoving,    // Removal in progress
    assignCompany, // Assign company by ID
    removeCompany, // Remove company association
    refetch        // Refresh data
  } = useItemCompany({ itemSlug, enabled: true });

  const handleAssign = async (companyId: string) => {
    const success = await assignCompany(companyId);
    if (success) console.log('Company assigned!');
  };

  return (
    <div>
      {company ? (
        <div>
          <span>Company: {company.name}</span>
          <button onClick={removeCompany}>Remove</button>
        </div>
      ) : (
        <CompanySelector onSelect={(id) => handleAssign(id)} />
      )}
    </div>
  );
}
```

### تكوين التخزين المؤقت

| الإعداد | القيمة |
|---|---|
| `staleTime` | 5 دقائق |
| `gcTime` | 10 دقائق |
| `retry` | 2 محاولات |

### نقاط نهاية واجهة برمجة التطبيقات

يتصل الخطاف بنقاط نهاية REST التالية:

| الطريقة | نقطة النهاية | الوصف |
|---|---|---|
| `GET` | 4ـ | جلب الشركة الحالية لعنصر |
| 5 ــ | 6ـ | تعيين شركة لعنصر |
| `DELETE` | 8ـ | إزالة الشركة من عنصر |

## مكونات الإدارة

### محدد الشركة

عنصر القائمة المنسدلة لاختيار الشركات القائمة:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### شركة مشروط

نموذج لإنشاء الشركات أو تحريرها:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### إحصائيات الشركة

يعرض الإحصائيات المجمعة:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## الملفات الرئيسية

| ملف | المسار |
|---|---|
| شركة البند هوك | `hooks/use-item-company.ts` |
| خدمة الشركة | `lib/services/company.service.ts` |
| استعلامات الشركة | `lib/db/queries/company.queries.ts` |
| أنواع الشركات | `types/company.ts` |
| التحقق من صحة الشركة | 4ـ |
| محدد الشركة | 5 ــ |
| شركة مشروط | 6ـ |
| مدير شركة البند | `components/admin/items/item-company-manager.tsx` |
