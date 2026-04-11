---
id: multi-step-forms
title: Formularios de varios pasos
sidebar_label: Formularios de varios pasos
sidebar_position: 20
---

# Formularios de varios pasos

La plantilla Ever Works incluye un sistema de formulario genérico de varios pasos con seguimiento de pasos, cálculo de progreso, gestión de validación y una implementación concreta para la creación/edición de elementos. El sistema divide formularios complejos en pasos manejables con controles de navegación, un indicador visual de pasos y representación de pasos condicional.

## Descripción general de la arquitectura

| Componente | Camino | Propósito |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | Gancho genérico de gestión de estado de formulario de varios pasos |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | Implementación del formulario de artículo mediante el gancho de varios pasos |
| `StepIndicator` | `components/ui/multi-step-form.tsx` | Indicador visual de progreso de pasos |
| `StepNavigation` | `components/ui/multi-step-form.tsx` | Botones de navegación Anterior/Siguiente/Enviar |
| Pasos del formulario | `components/admin/items/form-steps/` | Componentes de pasos individuales (BasicInfo, MediaLinks, etc.) |

## El gancho `useMultiStepForm` Un gancho genérico y reutilizable para gestionar el estado del formulario de varios pasos:

### Interfaz

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

### Uso

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

### Métodos de navegación

| Método | Devoluciones | Descripción |
|---|---|---|
| `goToNext()` | `boolean` | Avanza al siguiente paso; llama a `onComplete` si está en el último paso; devuelve `false` si no puede avanzar |
| `goToPrevious()` | `boolean` | Vuelve al paso anterior; devuelve `false` si está en el primer paso |
| `goToStep(step)` | `boolean` | Salta a un paso específico; devuelve `false` si el paso está fuera de límites |
| `markStepAsCompleted(step)` | `void` | Agrega paso al conjunto completo |
| `markStepAsIncomplete(step)` | `void` | Elimina paso del conjunto completo |
| `reset()` | `void` | Restablece el paso inicial y borra todos los pasos completados |

### Cálculo de progreso

El progreso se calcula como un porcentaje basado en el paso actual:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### Guardias de límites

El gancho incluye protecciones para evitar una navegación no válida:

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

## Formulario de artículo de varios pasos

El `MultiStepItemForm` es una implementación concreta que utiliza `useMultiStepForm` para crear y editar elementos:

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

### Pasos del formulario

El formulario consta de hasta 5 pasos, siendo condicional el paso Ubicación:

| Paso | Componente | Tipo de datos | Descripción |
|---|---|---|---|
| 1 | `BasicInfoStep` | `BasicInfoData` | Nombre del artículo, slug y descripción |
| 2 | `MediaLinksStep` | `MediaLinksData` | URL del icono y URL de origen |
| 3 | `ClassificationStep` | `ClassificationData` | Matrices de categorías y etiquetas |
| 4 (condicional) | `LocationStep` | `LocationStepData` | Dirección, coordenadas, área de servicio |
| 4 o 5 | `ReviewStep` | `ReviewData` | Estado destacado y estado del artículo |

### Paso de ubicación condicional

El paso Ubicación se incluye condicionalmente según la configuración de ubicación:

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

### Estructura de datos del formulario

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

### Validación de pasos

Cada componente de paso informa su estado de validación a través de una devolución de llamada:

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

La navegación al siguiente paso solo se permite cuando el paso actual es válido:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### Paso Haga clic en Navegación

Los usuarios pueden hacer clic en los pasos completados para regresar:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### Envío de formulario

En el último paso, todas las secciones de datos del formulario se combinan en un único objeto de solicitud:

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

### Población de datos en modo de edición

Al editar un elemento existente, los datos del formulario se completan desde la propiedad del elemento:

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

## Componentes de la interfaz de usuario

### Indicador de paso

Muestra una barra de progreso visual con círculos de pasos:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### Navegación por pasos

Representa los botones Anterior, Siguiente, Enviar y Cancelar:

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

## Internacionalización

Todas las etiquetas de formulario y descripciones de pasos usan `next-intl` bajo el espacio de nombres `admin.ITEM_FORM` :

| Clave | Uso |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | Título del paso 1 |
| `STEPS.MEDIA_LINKS.TITLE` | Título del paso 2 |
| `STEPS.CLASSIFICATION.TITLE` | Título del paso 3 |
| `STEPS.LOCATION.TITLE` | Título del paso 4 (condicional) |
| `STEPS.REVIEW.TITLE` | Título del paso final |
| `NAVIGATION.NEXT` | Etiqueta del botón Siguiente |
| `NAVIGATION.PREVIOUS` | Etiqueta del botón anterior |
| `NAVIGATION.CREATE` | Enviar etiqueta del botón (modo crear) |
| `NAVIGATION.UPDATE` | Enviar etiqueta del botón (modo de edición) |

## Archivos clave

| Archivo | Camino |
|---|---|
| Gancho de forma de varios pasos | `hooks/use-multi-step-form.ts` |
| Formulario de artículo de varios pasos | `components/admin/items/multi-step-item-form.tsx` |
| Componentes de la interfaz de usuario del paso | `components/ui/multi-step-form.tsx` |
| Componentes del paso del formulario | `components/admin/items/form-steps/` |
