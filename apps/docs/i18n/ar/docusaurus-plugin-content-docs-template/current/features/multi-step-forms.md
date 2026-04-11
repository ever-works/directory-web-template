---
id: multi-step-forms
title: نماذج متعددة الخطوات
sidebar_label: نماذج متعددة الخطوات
sidebar_position: 20
---

# نماذج متعددة الخطوات

يتضمن قالب Ever Works نظامًا عامًا متعدد الخطوات مع تتبع الخطوات وحساب التقدم وإدارة التحقق من الصحة وتنفيذًا ملموسًا لإنشاء/تحرير العنصر. يقوم النظام بتقسيم النماذج المعقدة إلى خطوات يمكن التحكم فيها باستخدام عناصر التحكم في التنقل ومؤشر الخطوات المرئي وعرض الخطوات المشروطة.

## نظرة عامة على الهندسة المعمارية

| مكون | المسار | الغرض |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | ربط عام لإدارة حالة النموذج متعدد الخطوات |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | تنفيذ نموذج العنصر باستخدام الخطاف متعدد الخطوات |
| 4ـ | 5 ــ | مؤشر تقدم الخطوة المرئية |
| 6ـ | `components/ui/multi-step-form.tsx` | أزرار التنقل السابق/التالي/إرسال |
| خطوات النموذج | 8ـ | مكونات الخطوة الفردية (BasicInfo وMediaLinks وما إلى ذلك) |

## الخطاف 9

خطاف عام قابل لإعادة الاستخدام لإدارة حالة النموذج متعددة الخطوات:

### الواجهة

```tsx
interface UseMultiStepFormOptions {
  totalSteps: number;        // Total number of steps
  initialStep?: number;      // Starting step (default: 1)
  onStepChange?: (step: number) => void;  // Callback on step change
  onComplete?: () => void;   // Callback when form is completed
}

interface UseMultiStepFormReturn {
  currentStep: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  completedSteps: Set<number>;
  progress: number;          // Percentage (0-100)
  goToNext: () => boolean;
  goToPrevious: () => boolean;
  goToStep: (step: number) => boolean;
  markStepAsCompleted: (step: number) => void;
  markStepAsIncomplete: (step: number) => void;
  reset: () => void;
}
```

### الاستخدام

```tsx
import { useMultiStepForm } from '@/hooks/use-multi-step-form';

function MyWizard() {
  const {
    currentStep,
    isFirstStep,
    isLastStep,
    completedSteps,
    progress,
    goToNext,
    goToPrevious,
    goToStep,
    markStepAsCompleted
  } = useMultiStepForm({
    totalSteps: 4,
    initialStep: 1,
    onStepChange: (step) => console.log('Now on step:', step),
    onComplete: () => console.log('Form completed!')
  });

  return (
    <div>
      <p>Step {currentStep} of 4 ({progress}% complete)</p>
      <button onClick={goToPrevious} disabled={isFirstStep}>Back</button>
      <button onClick={goToNext} disabled={isLastStep}>Next</button>
    </div>
  );
}
```

### طرق الملاحة

| الطريقة | عوائد | الوصف |
|---|---|---|
| `goToNext()` | `boolean` | التقدم إلى الخطوة التالية؛ المكالمات 2  إذا كنت في الخطوة الأخيرة؛ يُرجع `false` إذا لم يتمكن من التقدم |
| 4ـ | 5 ــ | يعود إلى الخطوة السابقة؛ يُرجع `false` إذا كان في الخطوة الأولى |
| `goToStep(step)` | 8ـ | يقفز إلى خطوة محددة. يُرجع `false` إذا كانت الخطوة خارج الحدود |
| `markStepAsCompleted(step)` | `void` | يضيف خطوة إلى المجموعة المكتملة |
| ‹‹١٢› | 13 ــ | إزالة الخطوة من المجموعة المكتملة |
| 14 ــ | `void` | يعيد التعيين إلى الخطوة الأولية ويمسح جميع الخطوات المكتملة |

### حساب التقدم

يتم حساب التقدم كنسبة مئوية بناءً على الخطوة الحالية:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### حرس الحدود

يشتمل الخطاف على حراس لمنع التنقل غير الصالح:

```tsx
const goToStep = (step: number): boolean => {
  if (step < 1 || step > totalSteps) {
    return false;  // Out of bounds
  }
  setCurrentStep(step);
  onStepChange?.(step);
  return true;
};

const goToNext = (): boolean => {
  if (isLastStep) {
    onComplete?.();
    return false;  // Already at last step
  }
  return goToStep(currentStep + 1);
};
```

## نموذج البند متعدد الخطوات

يعد "0" تطبيقًا ملموسًا يستخدم "1" لإنشاء العناصر وتحريرها:

```tsx
import { MultiStepItemForm } from '@/components/admin/items/multi-step-item-form';

<MultiStepItemForm
  item={existingItem}        // null for create mode
  mode="create"              // 'create' | 'edit'
  onSubmit={(data) => handleSubmit(data)}
  onCancel={() => router.back()}
  isLoading={false}
/>
```

### خطوات النموذج

يتكون النموذج من ما يصل إلى 5 خطوات، مع كون خطوة الموقع مشروطة:

| خطوة | مكون | نوع البيانات | الوصف |
|---|---|---|---|
| 1 | `BasicInfoStep` | `BasicInfoData` | اسم العنصر والسلسلة والوصف |
| 2 | `MediaLinksStep` | `MediaLinksData` | عنوان URL للرمز وعنوان URL المصدر |
| 3 | 4ـ | 5 ــ | صفائف التصنيف والعلامات |
| 4 (مشروط) | 6ـ | `LocationStepData` | العنوان والإحداثيات ومنطقة الخدمة |
| 4 أو 5 | 8ـ | `ReviewData` | الحالة المميزة وحالة العنصر |

### خطوة الموقع المشروط

يتم تضمين خطوة الموقع بشكل مشروط بناءً على إعدادات الموقع:

```tsx
const { settings: locationSettings } = useLocationSettings();
const locationEnabled = locationSettings.enabled;

const FORM_STEPS = useMemo(() => {
  const steps = [
    { id: 'basic-info', title: t('STEPS.BASIC_INFO.TITLE'), description: '...' },
    { id: 'media-links', title: t('STEPS.MEDIA_LINKS.TITLE'), description: '...' },
    { id: 'classification', title: t('STEPS.CLASSIFICATION.TITLE'), description: '...' },
  ];

  if (locationEnabled) {
    steps.push({ id: 'location', title: t('STEPS.LOCATION.TITLE'), description: '...' });
  }

  steps.push({ id: 'review', title: t('STEPS.REVIEW.TITLE'), description: '...' });

  return steps;
}, [t, locationEnabled]);
```

### بنية بيانات النموذج

```tsx
interface FormData {
  basicInfo: {
    id: string;
    name: string;
    slug: string;
    description: string;
  };
  mediaLinks: {
    icon_url: string;
    source_url: string;
  };
  classification: {
    category: string[];
    tags: string[];
  };
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    service_area?: string;
    is_remote?: boolean;
    geocoded_by?: string;
  };
  review: {
    featured: boolean;
    status: string;
  };
}
```

### التحقق من صحة الخطوة

يقوم كل مكون خطوة بالإبلاغ عن حالة التحقق الخاصة به من خلال رد الاتصال:

```tsx
const handleStepValidation = (step: number, isValid: boolean) => {
  setStepValidation(prev => ({ ...prev, [step]: isValid }));

  if (isValid) {
    markStepAsCompleted(step);
  } else {
    markStepAsIncomplete(step);
  }
};
```

يُسمح بالانتقال إلى الخطوة التالية فقط عندما تكون الخطوة الحالية صالحة:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### الخطوة انقر على التنقل

يمكن للمستخدمين النقر على الخطوات المكتملة للرجوع مرة أخرى:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### تقديم النموذج

في الخطوة الأخيرة، يتم دمج جميع أقسام بيانات النموذج في كائن طلب واحد:

```tsx
function handleFormSubmit() {
  const combinedData = {
    ...formData.basicInfo,
    ...formData.mediaLinks,
    ...formData.classification,
    ...formData.review,
    ...(locationEnabled && hasLocationData(formData.location)
      ? { location: formData.location }
      : {}),
  };
  onSubmit(combinedData);
}
```

### تحرير تعداد بيانات الوضع

عند تحرير عنصر موجود، يتم تعبئة بيانات النموذج من خاصية العنصر:

```tsx
useEffect(() => {
  if (item && mode === 'edit') {
    setFormData({
      basicInfo: { id: item.id, name: item.name, slug: item.slug, description: item.description },
      mediaLinks: { icon_url: item.icon_url || '', source_url: item.source_url },
      classification: {
        category: Array.isArray(item.category) ? item.category : [],
        tags: Array.isArray(item.tags) ? item.tags : []
      },
      location: { /* ...mapped from item.location */ },
      review: { featured: item.featured || false, status: item.status }
    });
  }
}, [item, mode]);
```

## مكونات واجهة المستخدم

### مؤشر الخطوة

يعرض شريط التقدم المرئي مع دوائر الخطوات:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### التنقل بين الخطوات

يعرض الأزرار السابق والتالي والإرسال والإلغاء:

```tsx
<StepNavigation
  currentStep={currentStep}
  totalSteps={FORM_STEPS.length}
  isFirstStep={isFirstStep}
  isLastStep={isLastStep}
  canGoNext={canGoNext}
  canGoPrevious={canGoPrevious}
  isSubmitting={isLoading}
  onNext={handleNext}
  onPrevious={handlePrevious}
  onCancel={onCancel}
  nextLabel={t('NAVIGATION.NEXT')}
  previousLabel={t('NAVIGATION.PREVIOUS')}
  submitLabel={mode === 'create' ? t('NAVIGATION.CREATE') : t('NAVIGATION.UPDATE')}
  cancelLabel={t('NAVIGATION.CANCEL')}
  stepCounterLabel={t('NAVIGATION.STEP_COUNTER', { current: currentStep, total: FORM_STEPS.length })}
/>
```

## التدويل

تستخدم كافة تسميات النماذج وأوصاف الخطوات `next-intl` ضمن مساحة الاسم `admin.ITEM_FORM` :

| مفتاح | الاستخدام |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | عنوان الخطوة 1 |
| `STEPS.MEDIA_LINKS.TITLE` | عنوان الخطوة 2 |
| 4ـ | عنوان الخطوة 3 |
| 5 ــ | عنوان الخطوة 4 (مشروط) |
| 6ـ | عنوان الخطوة النهائية |
| `NAVIGATION.NEXT` | تسمية الزر التالي |
| 8ـ | تسمية الزر السابق |
| `NAVIGATION.CREATE` | إرسال تسمية الزر (وضع الإنشاء) |
| `NAVIGATION.UPDATE` | إرسال تسمية الزر (وضع التحرير) |

## الملفات الرئيسية

| ملف | المسار |
|---|---|
| خطاف متعدد الخطوات | `hooks/use-multi-step-form.ts` |
| نموذج البند متعدد الخطوات | ‹‹١٢› |
| مكونات واجهة المستخدم الخطوة | 13 ــ |
| مكونات خطوة النموذج | 14 ــ |
