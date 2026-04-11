---
id: multi-step-forms
title: Meerstapsformulieren
sidebar_label: Meerstapsformulieren
sidebar_position: 20
---

# Meerstapsformulieren

De Ever Works-sjabloon bevat een generiek formuliersysteem met meerdere stappen met stapregistratie, voortgangsberekening, validatiebeheer en een concrete implementatie voor het maken/bewerken van items. Het systeem splitst complexe formulieren op in beheersbare stappen met navigatieknoppen, een visuele stapindicator en voorwaardelijke stapweergave.

## Architectuuroverzicht

| Onderdeel | Pad | Doel |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | Generieke meerstapsvorm voor staatsbeheer |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | Implementatie van itemformulieren met behulp van de meerstapshaak |
| `StepIndicator` | `components/ui/multi-step-form.tsx` | Visuele stapvoortgangsindicator |
| `StepNavigation` | `components/ui/multi-step-form.tsx` | Navigatieknoppen Vorige/Volgende/Verzenden |
| Formulierstappen | `components/admin/items/form-steps/` | Individuele stapcomponenten (BasicInfo, MediaLinks, enz.) |

## De `useMultiStepForm` haak

Een generieke, herbruikbare hook voor het beheren van meerstapsformulierstatussen:

### Interface

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

### Gebruik

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

### Navigatiemethoden

| Werkwijze | Retouren | Beschrijving |
|---|---|---|
| `goToNext()` | `boolean` | Vooruitgang naar de volgende stap; roept `onComplete` bij de laatste stap; retourneert `false` als niet verder kan |
| `goToPrevious()` | `boolean` | Keert terug naar de vorige stap; retourneert `false` indien bij de eerste stap |
| `goToStep(step)` | `boolean` | Springt naar een specifieke stap; retourneert `false` als stap buiten bereik is |
| `markStepAsCompleted(step)` | `void` | Voegt stap toe aan de voltooide set |
| `markStepAsIncomplete(step)` | `void` | Verwijdert stap uit de voltooide set |
| `reset()` | `void` | Reset naar de beginstap en wist alle voltooide stappen |

### Voortgangsberekening

De voortgang wordt berekend als een percentage op basis van de huidige stap:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### Grenswachten

De haak is voorzien van bewakers om ongeldige navigatie te voorkomen:

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

## Artikelformulier met meerdere stappen

De `MultiStepItemForm` is een concrete implementatie die `useMultiStepForm` gebruikt voor het maken en bewerken van items:

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

### Formulierstappen

Het formulier bestaat uit maximaal 5 stappen, waarbij de stap Locatie voorwaardelijk is:

| Stap | Onderdeel | Gegevenstype | Beschrijving |
|---|---|---|---|
| 1 | `BasicInfoStep` | `BasicInfoData` | Artikelnaam, naaktslak en beschrijving |
| 2 | `MediaLinksStep` | `MediaLinksData` | Pictogram-URL en bron-URL |
| 3 | `ClassificationStep` | `ClassificationData` | Categorie- en tagsarrays |
| 4 (voorwaardelijk) | `LocationStep` | `LocationStepData` | Adres, coördinaten, servicegebied |
| 4 of 5 | `ReviewStep` | `ReviewData` | Uitgelichte status en itemstatus |

### Voorwaardelijke locatiestap

De stap Locatie is voorwaardelijk opgenomen op basis van locatie-instellingen:

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

### Structuur van formuliergegevens

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

### Stapvalidatie

Elke stapcomponent rapporteert zijn validatiestatus via een callback:

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

Navigeren naar de volgende stap is alleen toegestaan ​​als de huidige stap geldig is:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### Stap Klik op Navigatie

Gebruikers kunnen op voltooide stappen klikken om terug te navigeren:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### Formulierinzending

In de laatste stap worden alle formuliergegevenssecties gecombineerd tot één enkel verzoekobject:

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

### Bewerkingsmodus Gegevenspopulatie

Wanneer u een bestaand item bewerkt, worden formuliergegevens ingevuld vanuit de itemprop:

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

## UI-componenten

### Stapindicator

Geeft een visuele voortgangsbalk met stapcirkels weer:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### Stapnavigatie

Geeft de knoppen Vorige, Volgende, Verzenden en Annuleren weer:

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

## Internationalisering

Alle formulierlabels en stapbeschrijvingen gebruiken `next-intl` onder de naamruimte `admin.ITEM_FORM` :

| Sleutel | Gebruik |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | Stap 1 titel |
| `STEPS.MEDIA_LINKS.TITLE` | Titel van stap 2 |
| `STEPS.CLASSIFICATION.TITLE` | Stap 3 titel |
| `STEPS.LOCATION.TITLE` | Titel van stap 4 (voorwaardelijk) |
| `STEPS.REVIEW.TITLE` | Titel laatste stap |
| `NAVIGATION.NEXT` | Volgende knoplabel |
| `NAVIGATION.PREVIOUS` | Vorige knoplabel |
| `NAVIGATION.CREATE` | Knoplabel indienen (maakmodus) |
| `NAVIGATION.UPDATE` | Knoplabel indienen (bewerkmodus) |

## Sleutelbestanden

| Bestand | Pad |
|---|---|
| Meerstapsvormhaak | `hooks/use-multi-step-form.ts` |
| Artikelformulier met meerdere stappen | `components/admin/items/multi-step-item-form.tsx` |
| Stap UI-componenten | `components/ui/multi-step-form.tsx` |
| Formulierstapcomponenten | `components/admin/items/form-steps/` |
