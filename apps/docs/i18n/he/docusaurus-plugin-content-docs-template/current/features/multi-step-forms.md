---
id: multi-step-forms
title: טפסים מרובי שלבים
sidebar_label: טפסים מרובי שלבים
sidebar_position: 20
---

# טפסים מרובי-שלבים

תבנית Ever Works כוללת מערכת טפסים גנרית רב-שלבית עם מעקב אחר צעדים, חישוב התקדמות, ניהול אימות ויישום קונקרטי ליצירת/עריכת פריט. המערכת מפצלת טפסים מורכבים לשלבים הניתנים לניהול עם בקרות ניווט, מחוון צעדים חזותיים ועיבוד שלבים מותנה.

## סקירה כללית של אדריכלות

| רכיב | נתיב | מטרה |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | וו ניהול מצב טופס רב-שלבי כללי |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | יישום טופס פריט באמצעות הוו רב-שלבי |
| `StepIndicator` | `components/ui/multi-step-form.tsx` | מחוון התקדמות צעד חזותי |
| `StepNavigation` | `components/ui/multi-step-form.tsx` | לחצני ניווט הקודם/הבא/שלח |
| שלבי טופס | `components/admin/items/form-steps/` | רכיבי צעד בודדים (BasicInfo, MediaLinks וכו') |

## הקרס `useMultiStepForm` וו גנרי לשימוש חוזר לניהול מצב טופס רב-שלבי:

### ממשק

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

### שימוש

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

### שיטות ניווט

| שיטה | מחזיר | תיאור |
|---|---|---|
| `goToNext()` | `boolean` | מתקדם לשלב הבא; קורא `onComplete` אם בשלב האחרון; מחזירה `false` אם לא יכול להתקדם |
| `goToPrevious()` | `boolean` | חוזר לשלב הקודם; מחזירה `false` אם בשלב הראשון |
| `goToStep(step)` | `boolean` | קופץ לשלב מסוים; מחזירה `false` אם הצעד הוא מחוץ לתחום |
| `markStepAsCompleted(step)` | `void` | מוסיף שלב לסט שהושלם |
| `markStepAsIncomplete(step)` | `void` | מסיר שלב מהסט שהושלם |
| `reset()` | `void` | מאפס לשלב הראשוני ומנקה את כל השלבים שהושלמו |

### חישוב התקדמות

ההתקדמות מחושבת כאחוז על סמך השלב הנוכחי:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### משמרות גבולות

הקרס כולל מגנים למניעת ניווט לא חוקי:

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

## טופס פריט רב-שלבי

ה- `MultiStepItemForm` הוא יישום קונקרטי המשתמש ב- `useMultiStepForm` ליצירה ועריכה של פריטים:

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

### שלבי טופס

הטופס מורכב מ-5 שלבים לכל היותר, כאשר שלב המיקום מותנה:

| שלב | רכיב | סוג נתונים | תיאור |
|---|---|---|---|
| 1 | `BasicInfoStep` | `BasicInfoData` | שם הפריט, הקליע והתיאור |
| 2 | `MediaLinksStep` | `MediaLinksData` | כתובת אתר של סמל וכתובת מקור |
| 3 | `ClassificationStep` | `ClassificationData` | מערכי קטגוריות ותגים |
| 4 (מותנה) | `LocationStep` | `LocationStepData` | כתובת, קואורדינטות, אזור שירות |
| 4 או 5 | `ReviewStep` | `ReviewData` | סטטוס מומלץ וסטטוס פריט |

### שלב מיקום מותנה

שלב המיקום נכלל בהתאם להגדרות המיקום:

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

### מבנה נתוני טופס

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

### אימות שלב

כל רכיב שלב מדווח על מצב האימות שלו באמצעות התקשרות חוזרת:

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

ניווט לשלב הבא מותר רק כאשר השלב הנוכחי תקף:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### שלב לחץ על ניווט

משתמשים יכולים ללחוץ על השלבים שהושלמו כדי לנווט אחורה:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### שליחת טופס

בשלב האחרון, כל מקטעי נתוני הטופס משולבים לאובייקט בקשה בודד:

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

### עריכת מצב נתונים אוכלוסיית

בעת עריכת פריט קיים, נתוני הטופס מאוכלסים ממאגר הפריט:

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

## רכיבי ממשק משתמש

### מחוון שלב

מציג סרגל התקדמות חזותי עם עיגולי צעדים:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### ניווט צעד

עיבוד לחצני הקודם, הבא, שלח וביטול:

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

## בינלאומי

כל תוויות הטפסים ותיאורי השלבים משתמשים ב- `next-intl` תחת מרחב השמות `admin.ITEM_FORM` :

| מפתח | שימוש |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | כותרת שלב 1 |
| `STEPS.MEDIA_LINKS.TITLE` | כותרת שלב 2 |
| `STEPS.CLASSIFICATION.TITLE` | כותרת שלב 3 |
| `STEPS.LOCATION.TITLE` | כותרת שלב 4 (מותנה) |
| `STEPS.REVIEW.TITLE` | כותרת השלב האחרון |
| `NAVIGATION.NEXT` | תווית הלחצן הבא |
| `NAVIGATION.PREVIOUS` | תווית הכפתור הקודמת |
| `NAVIGATION.CREATE` | תווית לחצן שלח (מצב יצירה) |
| `NAVIGATION.UPDATE` | תווית לחצן שלח (מצב עריכה) |

## קבצי מפתח

| קובץ | נתיב |
|---|---|
| וו טופס רב-שלבי | `hooks/use-multi-step-form.ts` |
| טופס פריט רב-שלבי | `components/admin/items/multi-step-item-form.tsx` |
| רכיבי ממשק משתמש שלב | `components/ui/multi-step-form.tsx` |
| רכיבי שלב טופס | `components/admin/items/form-steps/` |
