---
id: multi-step-forms
title: Formularze wieloetapowe
sidebar_label: Formularze wieloetapowe
sidebar_position: 20
---

# Formularze wieloetapowe

Szablon Ever Works zawiera ogólny, wieloetapowy system formularzy ze śledzeniem kroków, obliczaniem postępu, zarządzaniem walidacją i konkretną implementacją tworzenia/edycji elementów. System dzieli złożone formularze na łatwe do zarządzania kroki za pomocą elementów sterujących nawigacją, wizualnym wskaźnikiem kroku i warunkowym renderowaniem kroków.

## Przegląd architektury

| Składnik | Ścieżka | Cel |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | Ogólny, wieloetapowy hak do zarządzania stanem formularza |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | Implementacja formularza pozycji przy użyciu wieloetapowego haka |
| `StepIndicator` | `components/ui/multi-step-form.tsx` | Wizualny wskaźnik postępu kroku |
| `StepNavigation` | `components/ui/multi-step-form.tsx` | Przyciski nawigacyjne Poprzedni/Dalej/Prześlij |
| Kroki formularza | `components/admin/items/form-steps/` | Poszczególne elementy kroku (BasicInfo, MediaLinks itp.) |

## Hak `useMultiStepForm` Ogólny hak wielokrotnego użytku do zarządzania wieloetapowym stanem formularza:

### Interfejs

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

### Użycie

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

### Metody nawigacji

| Metoda | Zwroty | Opis |
|---|---|---|
| `goToNext()` | `boolean` | Przechodzi do następnego kroku; wywołuje `onComplete` , jeśli jest na ostatnim kroku; zwraca `false` , jeśli nie można przejść dalej |
| `goToPrevious()` | `boolean` | Wraca do poprzedniego kroku; zwraca `false` , jeśli w pierwszym kroku |
| `goToStep(step)` | `boolean` | Przeskakuje do określonego kroku; zwraca `false` , jeśli krok jest poza zakresem |
| `markStepAsCompleted(step)` | `void` | Dodaje krok do ukończonego zestawu |
| `markStepAsIncomplete(step)` | `void` | Usuwa krok z ukończonego zestawu |
| `reset()` | `void` | Resetuje do kroku początkowego i kasuje wszystkie ukończone kroki |

### Obliczanie postępu

Postęp jest obliczany procentowo w oparciu o bieżący krok:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### Straż graniczna

Hak zawiera osłony zapobiegające nieprawidłowej nawigacji:

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

## Wieloetapowy formularz pozycji `MultiStepItemForm` to konkretna implementacja, która wykorzystuje `useMultiStepForm` do tworzenia i edytowania elementów:

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

### Kroki formularza

Formularz składa się z maksymalnie 5 kroków, przy czym krok Lokalizacja jest warunkowy:

| Krok | Składnik | Typ danych | Opis |
|---|---|---|---|
| 1 | `BasicInfoStep` | `BasicInfoData` | Nazwa przedmiotu, ślimak i opis |
| 2 | `MediaLinksStep` | `MediaLinksData` | Adres URL ikony i adres URL źródła |
| 3 | `ClassificationStep` | `ClassificationData` | Tablice kategorii i tagów |
| 4 (warunkowo) | `LocationStep` | `LocationStepData` | Adres, współrzędne, obszar działalności |
| 4 lub 5 | `ReviewStep` | `ReviewData` | Status polecany i status przedmiotu |

### Krok lokalizacji warunkowej

Krok Lokalizacja jest uwzględniany warunkowo na podstawie ustawień lokalizacji:

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

### Struktura danych formularza

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

### Krok walidacji

Każdy komponent kroku raportuje swój stan walidacji poprzez wywołanie zwrotne:

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

Przejście do następnego kroku jest dozwolone tylko wtedy, gdy bieżący krok jest ważny:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### Krok Kliknij Nawigacja

Użytkownicy mogą kliknąć ukończone kroki, aby wrócić:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### Przesłanie formularza

W ostatnim kroku wszystkie sekcje danych formularza są łączone w jeden obiekt żądania:

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

### Populacja danych w trybie edycji

Podczas edycji istniejącego elementu dane formularza są wypełniane z właściwości elementu:

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

## Składniki interfejsu użytkownika

### Wskaźnik kroku

Wyświetla wizualny pasek postępu z okręgami kroków:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### Nawigacja krokowa

Renderuje przyciski Poprzedni, Następny, Prześlij i Anuluj:

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

## Internacjonalizacja

Wszystkie etykiety formularzy i opisy kroków używają `next-intl` w przestrzeni nazw `admin.ITEM_FORM` :

| Klucz | Użycie |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | Tytuł kroku 1 |
| `STEPS.MEDIA_LINKS.TITLE` | Tytuł kroku 2 |
| `STEPS.CLASSIFICATION.TITLE` | Tytuł kroku 3 |
| `STEPS.LOCATION.TITLE` | Tytuł kroku 4 (warunkowy) |
| `STEPS.REVIEW.TITLE` | Tytuł ostatniego kroku |
| `NAVIGATION.NEXT` | Etykieta następnego przycisku |
| `NAVIGATION.PREVIOUS` | Poprzednia etykieta przycisku |
| `NAVIGATION.CREATE` | Etykieta przycisku Prześlij (tryb tworzenia) |
| `NAVIGATION.UPDATE` | Etykieta przycisku Prześlij (tryb edycji) |

## Kluczowe pliki

| Plik | Ścieżka |
|---|---|
| Hak wielostopniowy | `hooks/use-multi-step-form.ts` |
| Wieloetapowy formularz przedmiotu | `components/admin/items/multi-step-item-form.tsx` |
| Krok Komponenty interfejsu użytkownika | `components/ui/multi-step-form.tsx` |
| Komponenty kroku formularza | `components/admin/items/form-steps/` |
