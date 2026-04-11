---
id: multi-step-forms
title: 多步骤表格
sidebar_label: 多步骤表格
sidebar_position: 20
---

# 多步骤表格

Ever Works 模板包括一个通用的多步骤表单系统，具有步骤跟踪、进度计算、验证管理以及项目创建/编辑的具体实现。该系统通过导航控件、可视步骤指示器和条件步骤渲染将复杂的表单拆分为可管理的步骤。

## 架构概述

|组件|路径|目的|
|---|---|---|
| 0 | 1 |通用多步表单状态管理钩子 |
| 2 | 3 |使用多步钩子实现项目表单 |
| 4 | 5 |视觉步骤进度指示器|
| 6 | 7 |上一个/下一个/提交导航按钮 |
|表格步骤| 8 |各个步骤组件（BasicInfo、MediaLinks 等）|

## 9 钩子

用于管理多步骤表单状态的通用、可重用挂钩：

### 接口

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

＃＃＃ 用法

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

### 导航方法

|方法|返回|描述 |
|---|---|---|
| 0 | 1 |前进到下一步；如果在最后一步，则调用 2；如果无法前进则返回3
| 4 | 5 |返回上一步；如果在第一步 | 返回 6
| 7 | 8 |跳转到特定步骤；如果步长超出范围，则返回 9 |
| 10 | 11 |向已完成的集合添加步骤 |
| 12 | 13 |从已完成的集合中删除步骤 |
| 14 | 15 |重置为初始步骤并清除所有已完成的步骤 |

### 进度计算

进度根据当前步骤计算为百分比：

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### 边界守卫

该钩子包含防止无效导航的防护：

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

## 多步骤项目表格

0 是使用 1 创建和编辑项目的具体实现：

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

### 表格步骤

该表单最多包含 5 个步骤，其中“位置”步骤是有条件的：

|步骤|组件|数据类型 |描述 |
|---|---|---|---|
| 1 | 0 | 1 |项目名称、名称和描述 |
| 2 | 2 | 3 |图标 URL 和源 URL |
| 3 | 4 | 5 |类别和标签数组 |
| 4（有条件）| 6 | 7 |地址、坐标、服务区域 |
| 4 或 5 | 8 | 9 |特色状态和项目状态 |

### 条件定位步骤

根据位置设置有条件地包含“位置”步骤：

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

### 表单数据结构

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

### 步骤验证

每个步骤组件通过回调报告其验证状态：

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

仅当当前步骤有效时才允许导航到下一步：

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### 步骤点击导航

用户可以单击已完成的步骤导航回来：

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### 表格提交

在最后一步，所有表单数据部分都组合成一个请求对象：

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

### 编辑模式数据填充

编辑现有项目时，表单数据将从 item 属性中填充：

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

## 用户界面组件

### 步数指示器

显示带有步骤圆圈的可视进度条：

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### 步骤导航

呈现上一个、下一个、提交和取消按钮：

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

## 国际化

所有表单标签和步骤描述都在 1 命名空间下使用 0：

|关键|用途 |
|---|---|
| 2 |第 1 步标题 |
| 3 |第 2 步标题 |
| 4 |步骤 3 标题 |
| 5 |第 4 步标题（有条件）|
| 6 |最后一步标题 |
| 7 |下一个按钮标签 |
| 8 |上一个按钮标签 |
| 9 |提交按钮标签（创建模式）|
| 10 |提交按钮标签（编辑模式）|

## 关键文件

|文件|路径|
|---|---|
|多级形式挂钩| 11 |
|多步骤项目表单 | 12 |
|步骤 UI 组件 | 13 |
|表单步骤组件| 14 |
