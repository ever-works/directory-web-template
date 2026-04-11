---
id: multi-step-forms
title: Многостъпкови форми
sidebar_label: Многостъпкови форми
sidebar_position: 20
---

# Многоетапни форми

Шаблонът Ever Works включва обща многоетапна система за формуляри с проследяване на стъпки, изчисляване на напредъка, управление на валидирането и конкретно изпълнение за създаване/редактиране на артикул. Системата разделя сложни форми на управляеми стъпки с контроли за навигация, визуален индикатор за стъпки и условно изобразяване на стъпки.

## Преглед на архитектурата

| Компонент | Път | Цел |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | Кука за управление на състояние на генерична многоетапна форма |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | Внедряване на формуляр за артикул с помощта на многоетапната кука |
| `StepIndicator` | `components/ui/multi-step-form.tsx` | Визуален индикатор за напредъка на стъпките |
| `StepNavigation` | `components/ui/multi-step-form.tsx` | Бутони за навигация Предишен/Следващ/Изпращане |
| Стъпки на формуляра | `components/admin/items/form-steps/` | Индивидуални компоненти на стъпка (BasicInfo, MediaLinks и др.) |

## Куката `useMultiStepForm` Обща кука за многократна употреба за управление на състояние на многоетапен формуляр:

### Интерфейс

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

### Използване

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

### Методи за навигация

| Метод | Връща | Описание |
|---|---|---|
| `goToNext()` | `boolean` | Напредва към следващата стъпка; извиква `onComplete` ако е на последната стъпка; връща `false` , ако не може да напредне |
| `goToPrevious()` | `boolean` | Връща се към предишната стъпка; връща `false` , ако на първата стъпка |
| `goToStep(step)` | `boolean` | Прескача до определена стъпка; връща `false` , ако стъпката е извън границите |
| `markStepAsCompleted(step)` | `void` | Добавя стъпка към завършения набор |
| `markStepAsIncomplete(step)` | `void` | Премахва стъпка от завършения набор |
| `reset()` | `void` | Връща се към първоначалната стъпка и изчиства всички завършени стъпки |

### Изчисляване на напредъка

Напредъкът се изчислява като процент въз основа на текущата стъпка:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### Гранична охрана

Куката включва предпазители за предотвратяване на невалидна навигация:

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

## Многоетапен формуляр за артикул `MultiStepItemForm` е конкретна реализация, която използва `useMultiStepForm` за създаване и редактиране на елементи:

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

### Стъпки на формуляра

Формулярът се състои от до 5 стъпки, като стъпката Местоположение е условна:

| Стъпка | Компонент | Тип данни | Описание |
|---|---|---|---|
| 1 | `BasicInfoStep` | `BasicInfoData` | Име на артикул, охлюв и описание |
| 2 | `MediaLinksStep` | `MediaLinksData` | URL адрес на икона и URL адрес на източника |
| 3 | `ClassificationStep` | `ClassificationData` | Категории и етикети масиви |
| 4 (условно) | `LocationStep` | `LocationStepData` | Адрес, координати, зона на обслужване |
| 4 или 5 | `ReviewStep` | `ReviewData` | Представено състояние и състояние на артикул |

### Стъпка на условно местоположение

Стъпката за местоположение е включена условно въз основа на настройките за местоположение:

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

### Структура на данните на формуляра

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

### Стъпка за валидиране

Всеки компонент на стъпка отчита своето състояние на валидиране чрез обратно извикване:

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

Навигацията към следващата стъпка е разрешена само когато текущата стъпка е валидна:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### Стъпка Щракнете Навигация

Потребителите могат да кликнат върху изпълнените стъпки, за да се върнат назад:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### Изпращане на формуляр

На последната стъпка всички секции с данни на формуляра се комбинират в един обект на заявка:

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

### Попълване на данни в режим на редактиране

Когато редактирате съществуващ елемент, данните за формуляра се попълват от подложката на елемента:

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

## UI компоненти

### Индикатор за стъпка

Показва визуална лента за напредъка с кръгове със стъпки:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### Стъпка за навигация

Изобразява бутони Предишен, Следващ, Изпращане и Отказ:

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

## Интернационализация

Всички етикети на формуляри и описания на стъпки използват `next-intl` под пространството от имена `admin.ITEM_FORM` :

| Ключ | Използване |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | Стъпка 1 заглавие |
| `STEPS.MEDIA_LINKS.TITLE` | Заглавие на стъпка 2 |
| `STEPS.CLASSIFICATION.TITLE` | Заглавие на стъпка 3 |
| `STEPS.LOCATION.TITLE` | Заглавие на стъпка 4 (условно) |
| `STEPS.REVIEW.TITLE` | Заглавие на последната стъпка |
| `NAVIGATION.NEXT` | Етикет на следващия бутон |
| `NAVIGATION.PREVIOUS` | Етикет на предишен бутон |
| `NAVIGATION.CREATE` | Изпращане на етикет на бутона (режим на създаване) |
| `NAVIGATION.UPDATE` | Етикет на бутона за изпращане (режим на редактиране) |

## Ключови файлове

| Файл | Път |
|---|---|
| Многостепенна кука за форма | `hooks/use-multi-step-form.ts` |
| Многоетапен формуляр за артикул | `components/admin/items/multi-step-item-form.tsx` |
| Стъпка Компоненти на потребителския интерфейс | `components/ui/multi-step-form.tsx` |
| Компоненти на стъпка на формуляр | `components/admin/items/form-steps/` |
