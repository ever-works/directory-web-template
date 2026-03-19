---
id: use-surveys-enabled-reference
title: useSurveysEnabled Hook Reference
sidebar_label: useSurveysEnabled
sidebar_position: 106
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useSurveysEnabled

A hook that checks whether the surveys feature is enabled in the application settings.

**Source file:** `template/hooks/use-surveys-enabled.ts`

## Overview

`useSurveysEnabled` reads the `surveysEnabled` flag from the `SettingsProvider` context. Because the value is server-rendered and passed through React context, there is no loading delay or network request -- the result is available immediately on mount.

When surveys are enabled, the application can display survey prompts to users. This hook controls whether the survey subsystem is active at all. To check whether specific global surveys are available to display, use `useHasGlobalSurveys` instead.

## Signature

```ts
function useSurveysEnabled(): {
  surveysEnabled: boolean;
  loading: boolean;
  error: Error | null;
}
```

## Parameters

This hook takes no parameters.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `surveysEnabled` | `boolean` | `true` if the surveys feature is enabled in application settings, `false` otherwise |
| `loading` | `boolean` | Always `false` -- the value is available synchronously from context |
| `error` | `Error \| null` | Always `null` -- no asynchronous operation is performed |

### Fallback Behavior

If the component is rendered outside of a `SettingsProvider`, the hook falls back to `surveysEnabled: true` (the provider's default fallback value).

## Implementation Details

1. The hook calls `useSettings()` to access the `SettingsProvider` context.
2. It destructures the `surveysEnabled` boolean from the context value.
3. It returns the value along with `loading: false` and `error: null`, since the value comes from server-rendered context and involves no asynchronous fetching.

## Usage Examples

### Conditionally rendering the survey banner

```tsx
import { useSurveysEnabled } from '@/hooks/use-surveys-enabled';

function AppLayout({ children }: { children: React.ReactNode }) {
  const { surveysEnabled } = useSurveysEnabled();

  return (
    <div>
      <Header />
      {surveysEnabled && <SurveyBanner />}
      <main>{children}</main>
      <Footer />
    </div>
  );
}
```

### Guarding the survey admin section

```tsx
import { useSurveysEnabled } from '@/hooks/use-surveys-enabled';

function AdminSurveysPage() {
  const { surveysEnabled } = useSurveysEnabled();

  if (!surveysEnabled) {
    return (
      <DisabledFeatureNotice
        feature="Surveys"
        description="Enable surveys in your application settings to start collecting feedback."
      />
    );
  }

  return <SurveyManagementDashboard />;
}
```

### Combined with useHasGlobalSurveys

```tsx
import { useSurveysEnabled } from '@/hooks/use-surveys-enabled';
import { useHasGlobalSurveys } from '@/hooks/use-has-global-surveys';

function GlobalSurveyPrompt() {
  const { surveysEnabled } = useSurveysEnabled();
  const { hasGlobalSurveys } = useHasGlobalSurveys();

  // Only show prompt when surveys are enabled AND global surveys exist
  if (!surveysEnabled || !hasGlobalSurveys) {
    return null;
  }

  return <SurveyModal />;
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `SettingsProvider` | Provides the `surveysEnabled` value through React context |

## Related Hooks

- [`useHasGlobalSurveys`](/template/hooks/use-has-global-surveys-reference) -- Checks whether published global surveys exist
- [`useCategoriesEnabled`](/template/hooks/use-categories-enabled-reference) -- Checks whether the categories feature is enabled
- [`useCompaniesEnabled`](/template/hooks/use-companies-enabled-reference) -- Checks whether the companies feature is enabled
- [`useTagsEnabled`](/template/hooks/use-tags-enabled-reference) -- Checks whether the tags feature is enabled
