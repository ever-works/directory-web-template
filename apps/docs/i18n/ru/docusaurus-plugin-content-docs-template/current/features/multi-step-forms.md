---
id: multi-step-forms
title: Многошаговые формы
sidebar_label: Многошаговые формы
sidebar_position: 20
---

# Многошаговые формы

Шаблон Ever Works включает в себя общую многоэтапную систему форм с отслеживанием шагов, расчетом прогресса, управлением проверкой и конкретной реализацией создания/редактирования элементов. Система разбивает сложные формы на управляемые шаги с помощью элементов управления навигацией, визуальным индикатором шагов и условной отрисовкой шагов.

## Обзор архитектуры

| Компонент | Путь | Цель |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | Общий многошаговый хук управления состоянием формы |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | Реализация формы элемента с помощью многошагового хука |
| `StepIndicator` | `components/ui/multi-step-form.tsx` | Визуальный индикатор выполнения шага |
| `StepNavigation` | `components/ui/multi-step-form.tsx` | Кнопки навигации «Предыдущий/Следующий/Отправить» |
| Шаги формы | `components/admin/items/form-steps/` | Отдельные компоненты шага (BasicInfo, MediaLinks и т. д.) |

## Крючок `useMultiStepForm` Общий многоразовый хук для управления состоянием многошаговой формы:

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

### Использование

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

### Методы навигации

| Метод | Возврат | Описание |
|---|---|---|
| `goToNext()` | `boolean` | Переход к следующему шагу; вызывает `onComplete` , если на последнем шаге; возвращает `false` , если невозможно перейти |
| `goToPrevious()` | `boolean` | Возврат к предыдущему шагу; возвращает `false` , если на первом шаге |
| `goToStep(step)` | `boolean` | Переходит к определенному шагу; возвращает `false` , если шаг выходит за пределы |
| `markStepAsCompleted(step)` | `void` | Добавляет шаг в завершенный набор |
| `markStepAsIncomplete(step)` | `void` | Удаляет шаг из завершенного набора |
| `reset()` | `void` | Возврат к начальному шагу и очистка всех завершенных шагов |

### Расчет прогресса

Прогресс рассчитывается в процентах от текущего шага:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### Пограничники

Хук включает в себя защиту для предотвращения некорректной навигации:

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

## Многошаговая форма элемента `MultiStepItemForm` — это конкретная реализация, которая использует `useMultiStepForm` для создания и редактирования элементов:

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

### Шаги формы

Форма состоит из до 5 шагов, причем шаг «Местоположение» является условным:

| Шаг | Компонент | Тип данных | Описание |
|---|---|---|---|
| 1 | `BasicInfoStep` | `BasicInfoData` | Имя элемента, номер и описание |
| 2 | `MediaLinksStep` | `MediaLinksData` | URL-адрес значка и URL-адрес источника |
| 3 | `ClassificationStep` | `ClassificationData` | Массивы категорий и тегов |
| 4 (условно) | `LocationStep` | `LocationStepData` | Адрес, координаты, территория обслуживания |
| 4 или 5 | `ReviewStep` | `ReviewData` | Избранный статус и статус товара |

### Шаг условного местоположения

Шаг Местоположение включается условно в зависимости от настроек местоположения:

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

### Структура данных формы

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

### Шаг проверки

Каждый компонент шага сообщает о своем состоянии проверки посредством обратного вызова:

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

Переход к следующему шагу разрешен только в том случае, если текущий шаг действителен:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### Шаг Нажмите Навигация

Пользователи могут нажать на завершенные шаги, чтобы вернуться назад:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### Отправка формы

На заключительном этапе все разделы данных формы объединяются в один объект запроса:

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

### Заполнение данных режима редактирования

При редактировании существующего элемента данные формы заполняются из свойства элемента:

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

## Компоненты пользовательского интерфейса

### Индикатор шага

Отображает визуальный индикатор выполнения с кружками шагов:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### Шаг навигации

Отрисовывает кнопки «Предыдущий», «Далее», «Отправить» и «Отмена»:

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

Все метки форм и описания шагов используют `next-intl` в пространстве имен `admin.ITEM_FORM` :

| Ключ | Использование |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | Название шага 1 |
| `STEPS.MEDIA_LINKS.TITLE` | Название шага 2 |
| `STEPS.CLASSIFICATION.TITLE` | Название шага 3 |
| `STEPS.LOCATION.TITLE` | Название шага 4 (условное) |
| `STEPS.REVIEW.TITLE` | Название финального шага |
| `NAVIGATION.NEXT` | Надпись на следующей кнопке |
| `NAVIGATION.PREVIOUS` | Предыдущая метка кнопки |
| `NAVIGATION.CREATE` | Надпись кнопки «Отправить» (режим создания) |
| `NAVIGATION.UPDATE` | Надпись кнопки «Отправить» (режим редактирования) |

## Ключевые файлы

| Файл | Путь |
|---|---|
| Многоступенчатый крючок формы | `hooks/use-multi-step-form.ts` |
| Многошаговая форма элемента | `components/admin/items/multi-step-item-form.tsx` |
| Компоненты пользовательского интерфейса Step | `components/ui/multi-step-form.tsx` |
| Компоненты шага формы | `components/admin/items/form-steps/` |
