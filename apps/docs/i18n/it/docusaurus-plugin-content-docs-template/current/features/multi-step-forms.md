---
id: multi-step-forms
title: Moduli a più passaggi
sidebar_label: Moduli a più passaggi
sidebar_position: 20
---

# Moduli a più passaggi

Il modello Ever Works include un sistema di moduli generico a più passaggi con monitoraggio dei passaggi, calcolo dell'avanzamento, gestione della convalida e un'implementazione concreta per la creazione/modifica degli elementi. Il sistema suddivide i moduli complessi in passaggi gestibili con controlli di navigazione, un indicatore visivo dei passaggi e rendering dei passaggi condizionali.

## Panoramica dell'architettura

| Componente | Percorso | Scopo |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | Hook generico per la gestione dello stato del modulo multifase |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | Implementazione del modulo dell'elemento utilizzando l'hook multi-step |
| `StepIndicator` | `components/ui/multi-step-form.tsx` | Indicatore visivo di avanzamento dei passaggi |
| `StepNavigation` | `components/ui/multi-step-form.tsx` | Pulsanti di navigazione Precedente/Successivo/Invia |
| Passaggi del modulo | `components/admin/items/form-steps/` | Componenti dei singoli passaggi (BasicInfo, MediaLinks, ecc.) |

## Il gancio `useMultiStepForm` Un hook generico e riutilizzabile per la gestione dello stato del modulo in più passaggi:

### Interfaccia

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

### Utilizzo

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

### Metodi di navigazione

| Metodo | Resi | Descrizione |
|---|---|---|
| `goToNext()` | `boolean` | Avanza al passaggio successivo; chiama `onComplete` se all'ultimo passo; restituisce `false` se non può avanzare |
| `goToPrevious()` | `boolean` | Ritorna al passaggio precedente; restituisce `false` se al primo passo |
| `goToStep(step)` | `boolean` | Salta a un passaggio specifico; restituisce `false` se il passo è fuori limite |
| `markStepAsCompleted(step)` | `void` | Aggiunge un passaggio al set completato |
| `markStepAsIncomplete(step)` | `void` | Rimuove il passaggio dal set completato |
| `reset()` | `void` | Ripristina il passaggio iniziale e cancella tutti i passaggi completati |

### Calcolo dell'avanzamento

Il progresso viene calcolato come percentuale in base al passaggio corrente:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### Guardie di confine

Il gancio include protezioni per impedire la navigazione non valida:

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

## Modulo articolo in più passaggi `MultiStepItemForm` è un'implementazione concreta che utilizza `useMultiStepForm` per creare e modificare elementi:

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

### Passaggi del modulo

Il modulo è composto da un massimo di 5 passaggi, con il passaggio Posizione condizionale:

| Passo | Componente | Tipo di dati | Descrizione |
|---|---|---|---|
| 1| `BasicInfoStep` | `BasicInfoData` | Nome dell'articolo, lumaca e descrizione |
| 2| `MediaLinksStep` | `MediaLinksData` | URL dell'icona e URL di origine |
| 3| `ClassificationStep` | `ClassificationData` | Array di categorie e tag |
| 4 (condizionale) | `LocationStep` | `LocationStepData` | Indirizzo, coordinate, area di servizio |
| 4 o 5 | `ReviewStep` | `ReviewData` | Stato in primo piano e stato dell'articolo |

### Passaggio di posizione condizionale

Il passaggio Posizione è incluso in modo condizionale in base alle impostazioni di posizione:

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

### Struttura dati del modulo

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

### Convalida del passaggio

Ogni componente del passaggio segnala il proprio stato di convalida tramite un callback:

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

La navigazione al passaggio successivo è consentita solo quando il passaggio corrente è valido:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### Passaggio Fare clic su Navigazione

Gli utenti possono fare clic sui passaggi completati per tornare indietro:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### Invio modulo

Nel passaggio finale, tutte le sezioni dei dati del modulo vengono combinate in un unico oggetto di richiesta:

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

### Compilazione dati in modalità Modifica

Quando si modifica un elemento esistente, i dati del modulo vengono popolati dalla prop dell'elemento:

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

## Componenti dell'interfaccia utente

### Indicatore di passaggio

Visualizza una barra di avanzamento visiva con cerchi di passaggi:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### Navigazione nei passaggi

Renderizza i pulsanti Precedente, Successivo, Invia e Annulla:

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

## Internazionalizzazione

Tutte le etichette dei moduli e le descrizioni dei passaggi utilizzano `next-intl` sotto lo spazio dei nomi `admin.ITEM_FORM` :

| Chiave | Utilizzo |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | Titolo del passaggio 1 |
| `STEPS.MEDIA_LINKS.TITLE` | Titolo del passaggio 2 |
| `STEPS.CLASSIFICATION.TITLE` | Titolo del passaggio 3 |
| `STEPS.LOCATION.TITLE` | Titolo del passaggio 4 (condizionale) |
| `STEPS.REVIEW.TITLE` | Titolo del passaggio finale |
| `NAVIGATION.NEXT` | Etichetta del pulsante successivo |
| `NAVIGATION.PREVIOUS` | Etichetta del pulsante precedente |
| `NAVIGATION.CREATE` | Invia etichetta pulsante (modalità crea) |
| `NAVIGATION.UPDATE` | Invia etichetta pulsante (modalità modifica) |

## File chiave

| File | Percorso |
|---|---|
| Gancio per forma multifase | `hooks/use-multi-step-form.ts` |
| Modulo articolo in più passaggi | `components/admin/items/multi-step-item-form.tsx` |
| Passaggio Componenti dell'interfaccia utente | `components/ui/multi-step-form.tsx` |
| Componenti della fase del modulo | `components/admin/items/form-steps/` |
