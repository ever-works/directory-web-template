---
id: url-extraction
title: نظام استخراج URL
sidebar_label: استخراج URL
sidebar_position: 13
---

# نظام استخراج URL

يتضمن قالب Ever Works نظامًا لاستخراج عناوين URL مدعومًا بالذكاء الاصطناعي والذي يقوم تلقائيًا باستخراج البيانات التعريفية من عناوين URL، بما في ذلك أسماء المنتجات والأوصاف والفئات والعلامات ومعلومات العلامة التجارية والصور. تعمل هذه الميزة على تبسيط عملية إرسال العنصر عن طريق التعبئة التلقائية لحقول النموذج من عنوان URL المقدم.

## نظرة عامة على الهندسة المعمارية

| مكون | المسار | الغرض |
|---|---|---|
| `useUrlExtraction` هوك | `hooks/use-url-extraction.ts` | خطاف رد الفعل من جانب العميل لتحفيز الاستخراج |
| 2- نقطة النهاية | `app/api/extract/` | مسار واجهة برمجة التطبيقات (API) من جانب الخادم الذي يقوم بإجراء الاستخراج الفعلي |

## كيف يعمل

1. يقدم المستخدم عنوان URL في نموذج الإرسال
2. يرسل الخطاف 4 عنوان URL إلى نقطة النهاية 5
3. يقوم الخادم باستخراج البيانات الوصفية (الاسم، الوصف، الفئة، العلامات، العلامة التجارية، الصور)
4. يتم إرجاع البيانات المستخرجة ويمكن استخدامها لملء حقول النموذج تلقائيًا

## الخطاف 6

### الواجهة

```tsx
interface ExtractionResult {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  brand?: string;
  brand_logo_url?: string;
  images?: string[];
}

interface UseUrlExtractionReturn {
  isLoading: boolean;
  extractFromUrl: (url: string, existingCategories?: string[]) => Promise<ExtractionResult | null>;
}
```

### الاستخدام

```tsx
import { useUrlExtraction } from '@/hooks/use-url-extraction';

function SubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();

  const handleUrlSubmit = async (url: string) => {
    const existingCategories = ['Project Management', 'Time Tracking', 'CRM'];
    const result = await extractFromUrl(url, existingCategories);

    if (result) {
      // Auto-fill form fields with extracted data
      setFormData({
        name: result.name,
        description: result.description,
        category: result.category || '',
        tags: result.tags || [],
      });
    }
  };

  return (
    <div>
      <input
        type="url"
        placeholder="Enter product URL..."
        onBlur={(e) => handleUrlSubmit(e.target.value)}
      />
      {isLoading && <span>Extracting data...</span>}
    </div>
  );
}
```

## حقول البيانات المستخرجة

| المجال | اكتب | الوصف |
|---|---|---|
| `name` | `string` | اسم المنتج أو الخدمة المستخرج من الصفحة |
| `description` | `string` | وصف المنتج أو الوصف التعريفي |
| 4ـ | 5 ــ | الفئة المقترحة، تمت مطابقتها مع الفئات الموجودة عند توفيرها |
| 6ـ | `string[]?` | العلامات ذات الصلة المستخرجة من محتوى الصفحة |
| 8ـ | `string?` | العلامة التجارية أو اسم الشركة |
| `brand_logo_url` | `string?` | عنوان URL لصورة شعار العلامة التجارية |
| ‹‹١٢› | 13 ــ | مجموعة من عناوين URL للصور ذات الصلة الموجودة في الصفحة |

## مطابقة الفئة

تقبل الوظيفة 14 معلمة اختيارية 15. عند توفيرها، تحاول واجهة برمجة التطبيقات للاستخراج مطابقة المحتوى المستخرج مع هذه الفئات، مما يضمن توافق الفئة المقترحة مع تصنيف الموقع:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## معالجة الأخطاء

ينفذ الخطاف طبقات متعددة من معالجة الأخطاء:

| السيناريو | السلوك |
|---|---|
| عنوان URL فارغ | يظهر خطأ "لم يتم توفير عنوان URL" |
| فشل طلب HTTP | خطأ في السجلات، يظهر إشعار التوست |
| الميزة معطلة | يعود `null` بصمت (تدهور رشيق) |
| فشل واجهة برمجة التطبيقات | خطأ في السجلات، ويظهر الخبز المحمص مع الرسالة |
| خطأ غير متوقع | يلتقط كافة الأخطاء، ويظهر نخبًا عامًا، ويعيد `null` |

### تدهور رشيق

يدعم النظام التدهور الرشيق عندما لا يتم تكوين ميزة الاستخراج:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

يتيح ذلك لنموذج التقديم أن يعمل بشكل طبيعي حتى إذا لم يتم تكوين خدمة الاستخراج بالذكاء الاصطناعي، وذلك ببساطة بتخطي خطوة الملء التلقائي.

## تكامل الاستعلام التفاعلي

يستخدم الخطاف استعلام TanStack 0 لإدارة طلب الاستخراج:

```tsx
const mutation = useMutation({
  mutationFn: async ({ url, existingCategories }) => {
    const response = await serverClient.post('/api/extract', {
      url,
      existingCategories
    });
    // ... validation and error handling
    return response.data.data;
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to extract data from URL');
  }
});
```

فوائد استخدام 0:
- إدارة حالة التحميل التلقائي عبر `isPending` - معالجة الأخطاء المضمنة مع رد الاتصال 2
- واجهة برمجة التطبيقات المستندة إلى الوعد عبر `mutateAsync` ## التكامل مع نموذج الإرسال

عادةً ما يتم دمج استخراج عنوان URL في تدفق إرسال العنصر:

```tsx
function ItemSubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', tags: []
  });

  const handleUrlChange = async (url: string) => {
    if (!url) return;

    const result = await extractFromUrl(url, availableCategories);
    if (result) {
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        description: result.description || prev.description,
        category: result.category || prev.category,
        tags: result.tags?.length ? result.tags : prev.tags,
      }));
    }
  };

  return (
    <form>
      <input
        name="url"
        placeholder="Product URL"
        onBlur={(e) => handleUrlChange(e.target.value)}
        disabled={isLoading}
      />
      {/* Form fields auto-populated from extraction */}
    </form>
  );
}
```

## عميل واجهة برمجة التطبيقات

يستخدم الخطاف رمز القالب `serverClient` لاتصالات HTTP:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## الملفات الرئيسية

| ملف | المسار |
|---|---|
| ربط استخراج URL | `hooks/use-url-extraction.ts` |
| استخراج طريق API | `app/api/extract/route.ts` |
| عميل خادم API | `lib/api/server-api-client.ts` |
