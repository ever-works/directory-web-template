---
id: use-has-global-surveys-reference
title: useHasGlobalSurveys Hook Reference
sidebar_label: useHasGlobalSurveys
sidebar_position: 107
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useHasGlobalSurveys

A hook that checks whether any published global surveys exist.

**Source file:** `template/hooks/use-has-global-surveys.ts`

## Overview

`useHasGlobalSurveys` reads the `hasGlobalSurveys` flag from the `SettingsProvider` context. Because the value is server-rendered and passed through React context, there is no loading delay or network request -- the result is available immediately on mount.

Global surveys are surveys that target all users of the application (as opposed to item-specific or user-specific surveys). This hook is typically used to decide whether to render a global survey prompt or modal. It is distinct from `useSurveysEnabled`, which checks whether the survey feature is turned on at all.

## Signature

```ts
function useHasGlobalSurveys(): UseHasGlobalSurveysResult
```

### UseHasGlobalSurveysResult

```ts
interface UseHasGlobalSurveysResult {
  /** Whether there are published global surveys */
  hasGlobalSurveys: boolean;
  /** Whether the check is currently loading */
  isPending: boolean;
  /** Error if the check failed */
  error: Error | null;
}
```

## Parameters

This hook takes no parameters.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `hasGlobalSurveys` | `boolean` | `true` if there are published global surveys, `false` otherwise |
| `isPending` | `boolean` | Always `false` -- the value is available synchronously from context |
| `error` | `Error \| null` | Always `null` -- no asynchronous operation is performed |

### Fallback Behavior

If the component is rendered outside of a `SettingsProvider`, the hook falls back to `hasGlobalSurveys: false` (the provider's default fallback value). This is a conservative default -- no survey prompts will appear when the provider is missing.

## Implementation Details

1. The hook calls `useSettings()` to access the `SettingsProvider` context.
2. It destructures the `hasGlobalSurveys` boolean from the context value.
3. It returns the value along with `isPending: false` and `error: null`, since the value comes from server-rendered context and involves no asynchronous fetching.

Note that this hook uses `isPending` (rather than `loading` or `isLoading`) to name the loading state property, matching TanStack Query v5 conventions.

## Usage Examples

### Rendering a global survey modal

```tsx
import { useHasGlobalSurveys } from '@/hooks/use-has-global-surveys';

function GlobalSurveyTrigger() {
  const { hasGlobalSurveys, isPending } = useHasGlobalSurveys();

  if (isPending || !hasGlobalSurveys) {
    return null;
  }

  return <GlobalSurveyModal />;
}
```

### Combined with useSurveysEnabled for full gating

```tsx
import { useSurveysEnabled } from '@/hooks/use-surveys-enabled';
import { useHasGlobalSurveys } from '@/hooks/use-has-global-surveys';

function SurveyWidget() {
  const { surveysEnabled } = useSurveysEnabled();
  const { hasGlobalSurveys } = useHasGlobalSurveys();

  // Both conditions must be true: feature is on AND surveys exist
  if (!surveysEnabled || !hasGlobalSurveys) {
    return null;
  }

  return (
    <div className="survey-widget">
      <p>We would love your feedback!</p>
      <StartSurveyButton />
    </div>
  );
}
```

### Showing a survey indicator in the header

```tsx
import { useHasGlobalSurveys } from '@/hooks/use-has-global-surveys';

function HeaderActions() {
  const { hasGlobalSurveys } = useHasGlobalSurveys();

  return (
    <div className="flex items-center gap-4">
      <NotificationsIcon />
      {hasGlobalSurveys && (
        <button className="relative">
          <SurveyIcon />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      )}
      <UserMenu />
    </div>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `SettingsProvider` | Provides the `hasGlobalSurveys` value through React context |

## Related Hooks

- [`useSurveysEnabled`](/template/hooks/use-surveys-enabled-reference) -- Checks whether the surveys feature is enabled
- [`useCategoriesExists`](/template/hooks/use-categories-exists-reference) -- Checks whether categories exist in the database
- [`useTagsExists`](/template/hooks/use-tags-exists-reference) -- Checks whether tags exist in the database
