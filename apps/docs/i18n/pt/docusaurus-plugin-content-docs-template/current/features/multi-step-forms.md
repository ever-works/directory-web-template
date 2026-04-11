---
id: multi-step-forms
title: Formulários de várias etapas
sidebar_label: Formulários de várias etapas
sidebar_position: 20
---

# Formulários de várias etapas

O modelo Ever Works inclui um sistema genérico de formulário de várias etapas com rastreamento de etapas, cálculo de progresso, gerenciamento de validação e uma implementação concreta para criação/edição de itens. O sistema divide formulários complexos em etapas gerenciáveis ​​com controles de navegação, um indicador visual de etapas e renderização condicional de etapas.

## Visão geral da arquitetura

| Componente | Caminho | Finalidade |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | Gancho genérico de gerenciamento de estado de formulário de várias etapas |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | Implementação do formulário de item usando o gancho de várias etapas |
| `StepIndicator` | `components/ui/multi-step-form.tsx` | Indicador visual de progresso da etapa |
| `StepNavigation` | `components/ui/multi-step-form.tsx` | Botões de navegação Anterior/Próximo/Enviar |
| Etapas do formulário | `components/admin/items/form-steps/` | Componentes de etapas individuais (BasicInfo, MediaLinks, etc.) |

## O Gancho `useMultiStepForm` Um gancho genérico e reutilizável para gerenciar o estado do formulário em várias etapas:

###Interface

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

### Métodos de navegação

| Método | Devoluções | Descrição |
|---|---|---|
| `goToNext()` | `boolean` | Avança para a próxima etapa; chama `onComplete` se estiver no último passo; retorna `false` se não for possível avançar |
| `goToPrevious()` | `boolean` | Retorna ao passo anterior; retorna `false` se estiver no primeiro passo |
| `goToStep(step)` | `boolean` | Salta para uma etapa específica; retorna `false` se o passo estiver fora dos limites |
| `markStepAsCompleted(step)` | `void` | Adiciona etapa ao conjunto concluído |
| `markStepAsIncomplete(step)` | `void` | Remove etapa do conjunto concluído |
| `reset()` | `void` | Redefine para a etapa inicial e limpa todas as etapas concluídas |

### Cálculo do Progresso

O progresso é calculado como uma porcentagem com base na etapa atual:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### Guardas de Fronteira

O gancho inclui proteções para evitar navegação inválida:

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

## Formulário de item de várias etapas

O `MultiStepItemForm` é uma implementação concreta que usa `useMultiStepForm` para criar e editar itens:

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

### Etapas do formulário

O formulário consiste em até 5 etapas, sendo a etapa Localização condicional:

| Etapa | Componente | Tipo de dados | Descrição |
|---|---|---|---|
| 1 | `BasicInfoStep` | `BasicInfoData` | Nome do item, slug e descrição |
| 2 | `MediaLinksStep` | `MediaLinksData` | URL do ícone e URL de origem |
| 3 | `ClassificationStep` | `ClassificationData` | Matrizes de categorias e tags |
| 4 (condicional) | `LocationStep` | `LocationStepData` | Endereço, coordenadas, área de serviço |
| 4 ou 5 | `ReviewStep` | `ReviewData` | Status em destaque e status do item |

### Etapa de localização condicional

A etapa Localização é incluída condicionalmente com base nas configurações de localização:

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

### Estrutura de dados do formulário

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

### Etapa Validação

Cada componente de etapa relata seu estado de validação por meio de um retorno de chamada:

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

A navegação para a próxima etapa só é permitida quando a etapa atual for válida:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### Passo Clique Navegação

Os usuários podem clicar nas etapas concluídas para voltar:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### Envio de formulário

Na etapa final, todas as seções de dados do formulário são combinadas em um único objeto de solicitação:

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

### População de dados do modo de edição

Ao editar um item existente, os dados do formulário são preenchidos a partir da propriedade item:

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

## Componentes da IU

### Indicador de Passo

Exibe uma barra de progresso visual com círculos de etapas:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### Navegação por etapas

Renderiza os botões Anterior, Próximo, Enviar e Cancelar:

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

## Internacionalização

Todos os rótulos de formulário e descrições de etapas usam `next-intl` no namespace `admin.ITEM_FORM` :

| Chave | Uso |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | Título da etapa 1 |
| `STEPS.MEDIA_LINKS.TITLE` | Título da etapa 2 |
| `STEPS.CLASSIFICATION.TITLE` | Título da etapa 3 |
| `STEPS.LOCATION.TITLE` | Título da etapa 4 (condicional) |
| `STEPS.REVIEW.TITLE` | Título da etapa final |
| `NAVIGATION.NEXT` | Próximo rótulo do botão |
| `NAVIGATION.PREVIOUS` | Etiqueta do botão anterior |
| `NAVIGATION.CREATE` | Enviar rótulo do botão (modo de criação) |
| `NAVIGATION.UPDATE` | Enviar rótulo do botão (modo de edição) |

## Arquivos principais

| Arquivo | Caminho |
|---|---|
| Gancho de formulário de várias etapas | `hooks/use-multi-step-form.ts` |
| Formulário de item em várias etapas | `components/admin/items/multi-step-item-form.tsx` |
| Etapa Componentes da UI | `components/ui/multi-step-form.tsx` |
| Componentes da etapa do formulário | `components/admin/items/form-steps/` |
