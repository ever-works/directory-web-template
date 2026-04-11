---
id: multi-step-forms
title: Mehrstufige Formulare
sidebar_label: Mehrstufige Formulare
sidebar_position: 20
---

# Mehrstufige Formulare

Die Ever Works-Vorlage umfasst ein generisches mehrstufiges Formularsystem mit Schrittverfolgung, Fortschrittsberechnung, Validierungsmanagement und einer konkreten Implementierung für die Artikelerstellung/-bearbeitung. Das System unterteilt komplexe Formulare in überschaubare Schritte mit Navigationssteuerelementen, einer visuellen Schrittanzeige und bedingter Schrittwiedergabe.

## Architekturübersicht

| Komponente | Pfad | Zweck |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | Allgemeiner mehrstufiger Formularstatusverwaltungs-Hook |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | Implementierung des Elementformulars mithilfe des mehrstufigen Hooks |
| `StepIndicator` | `components/ui/multi-step-form.tsx` | Visuelle Schrittfortschrittsanzeige |
| `StepNavigation` | `components/ui/multi-step-form.tsx` | Navigationsschaltflächen „Zurück/Weiter/Senden“ |
| Formularschritte | `components/admin/items/form-steps/` | Einzelne Schrittkomponenten (BasicInfo, MediaLinks usw.) |

## Der `useMultiStepForm` Haken

Ein generischer, wiederverwendbarer Hook zum Verwalten des mehrstufigen Formularstatus:

### Schnittstelle

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

### Nutzung

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

### Navigationsmethoden

| Methode | Retouren | Beschreibung |
|---|---|---|
| `goToNext()` | `boolean` | Weiter zum nächsten Schritt; ruft `onComplete` auf, wenn im letzten Schritt; gibt `false` zurück, wenn kein Vorrücken möglich ist |
| `goToPrevious()` | `boolean` | Kehrt zum vorherigen Schritt zurück; gibt `false` zurück, wenn im ersten Schritt |
| `goToStep(step)` | `boolean` | Springt zu einem bestimmten Schritt; gibt `false` zurück, wenn der Schritt außerhalb der Grenzen liegt |
| `markStepAsCompleted(step)` | `void` | Fügt einen Schritt zum abgeschlossenen Satz hinzu |
| `markStepAsIncomplete(step)` | `void` | Entfernt Schritt aus der abgeschlossenen Menge |
| `reset()` | `void` | Setzt auf den ersten Schritt zurück und löscht alle abgeschlossenen Schritte |

### Fortschrittsberechnung

Der Fortschritt wird als Prozentsatz basierend auf dem aktuellen Schritt berechnet:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### Grenzwächter

Der Hook enthält Schutzvorrichtungen, um ungültige Navigation zu verhindern:

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

## Mehrstufiges Artikelformular

Das `MultiStepItemForm` ist eine konkrete Implementierung, die `useMultiStepForm` zum Erstellen und Bearbeiten von Elementen verwendet:

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

### Formularschritte

Das Formular besteht aus bis zu 5 Schritten, wobei der Standortschritt bedingt ist:

| Schritt | Komponente | Datentyp | Beschreibung |
|---|---|---|---|
| 1 | `BasicInfoStep` | `BasicInfoData` | Artikelname, Slug und Beschreibung |
| 2 | `MediaLinksStep` | `MediaLinksData` | Symbol-URL und Quell-URL |
| 3 | `ClassificationStep` | `ClassificationData` | Kategorie- und Tag-Arrays |
| 4 (bedingt) | `LocationStep` | `LocationStepData` | Adresse, Koordinaten, Einzugsgebiet |
| 4 oder 5 | `ReviewStep` | `ReviewData` | Hervorgehobener Status und Artikelstatus |

### Bedingter Standortschritt

Der Standortschritt ist abhängig von den Standorteinstellungen bedingt enthalten:

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

### Formulardatenstruktur

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

### Schrittvalidierung

Jede Schrittkomponente meldet ihren Validierungsstatus durch einen Rückruf:

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

Die Navigation zum nächsten Schritt ist nur zulässig, wenn der aktuelle Schritt gültig ist:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### Schritt Klicken Sie auf Navigation

Benutzer können auf abgeschlossene Schritte klicken, um zurück zu navigieren:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### Formularübermittlung

Im letzten Schritt werden alle Formulardatenabschnitte in einem einzigen Anfrageobjekt zusammengefasst:

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

### Datenpopulation im Bearbeitungsmodus

Beim Bearbeiten eines vorhandenen Artikels werden die Formulardaten aus der Artikelstütze ausgefüllt:

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

## UI-Komponenten

### Schrittanzeige

Zeigt einen visuellen Fortschrittsbalken mit Schrittkreisen an:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### Schrittnavigation

Rendert die Schaltflächen „Zurück“, „Weiter“, „Senden“ und „Abbrechen“:

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

## Internationalisierung

Alle Formularbezeichnungen und Schrittbeschreibungen verwenden `next-intl` unter dem Namensraum `admin.ITEM_FORM` :

| Schlüssel | Verwendung |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | Schritt 1 Titel |
| `STEPS.MEDIA_LINKS.TITLE` | Schritt 2 Titel |
| `STEPS.CLASSIFICATION.TITLE` | Schritt 3 Titel |
| `STEPS.LOCATION.TITLE` | Schritt 4 Titel (bedingt) |
| `STEPS.REVIEW.TITLE` | Titel des letzten Schritts |
| `NAVIGATION.NEXT` | Beschriftung der Schaltfläche „Weiter“ |
| `NAVIGATION.PREVIOUS` | Vorherige Schaltflächenbeschriftung |
| `NAVIGATION.CREATE` | Beschriftung der Schaltfläche „Senden“ (Erstellungsmodus) |
| `NAVIGATION.UPDATE` | Beschriftung der Schaltfläche „Senden“ (Bearbeitungsmodus) |

## Schlüsseldateien

| Datei | Pfad |
|---|---|
| Mehrstufiger Formhaken | `hooks/use-multi-step-form.ts` |
| Mehrstufiges Artikelformular | `components/admin/items/multi-step-item-form.tsx` |
| Step-UI-Komponenten | `components/ui/multi-step-form.tsx` |
| Formularschrittkomponenten | `components/admin/items/form-steps/` |
