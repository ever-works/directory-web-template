---
id: theme-system-deep-dive
title: "Дълбоко потапяне в тематична система"
sidebar_label: "Дълбоко потапяне в тематична система"
sidebar_position: 46
---

# Дълбоко потапяне в тематична система

## Преглед

Theme System предоставя цялостна, многопластова тематична инфраструктура, която управлява динамични цветови палитри, предварително изградени предварително зададени теми, класове CSS помощни програми и тематични метаданни за UI селектори. Той обхваща три модула: `theme-color-manager.ts` за приложение с палитри по време на изпълнение, `theme-utils.ts` за помощни класове и помощни функции на Tailwind и `themes.tsx` за дефиниции на теми с компоненти за преглед на React.

## Архитектура

Системата от теми е наслоена върху [Генератора на цветове](./color-generator-system) и се използва от `LayoutThemeContext`:

```
themes.tsx                    -- Theme definitions, metadata, previews
  |
theme-color-manager.ts        -- Runtime palette application (DOM manipulation)
  |-- EXTENDED_THEME_CONFIGS  -- Full color configs per theme
  |-- applyColorPalette()     -- Apply single color palette to DOM
  |-- applyThemeWithPalettes()-- Apply full theme to DOM
  |-- generateThemeCss()      -- Generate CSS string
  |-- applyCustomTheme()      -- Apply arbitrary colors
  |-- useThemeWithPalettes()  -- React hook wrapper
  |
theme-utils.ts                -- Utility classes, color lookups, builders
  |-- themeClasses            -- Pre-built Tailwind class maps
  |-- tailwindColors          -- Full Tailwind color palette reference
  |-- animationClasses        -- Animation utility classes
  |-- responsiveClasses       -- Responsive layout classes
  |-- THEME_PRESETS           -- Simple color presets
  |
color-generator.ts            -- Mathematical palette generation (see separate doc)
```

И трите модула препращат към `ThemeKey` и `ThemeConfig` от `@/components/context/LayoutThemeContext`, осигурявайки съгласуваност на типа в цялата тематична система.

### Налични теми

|Ключ|Етикет|Първичен|Вторичен|
|-----|-------|---------|-----------|
|`everworks`|По подразбиране|`#3d70ef`|`#00c853`|
|`corporate`|Корпоративен|`#00c853`|`#e74c3c`|
|`material`|Материал|`#673ab7`|`#ff9800`|
|`funny`|смешно|`#ff4081`|`#ffeb3b`|

## Справка за API

### Износ от `lib/theme-color-manager.ts`

#### `EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig>`

Пълни цветови конфигурации за всяка тема, включително основни, вторични, акценти, фон, повърхност, текст и стойности textSecondary.

#### `applyColorPalette(colorName: string, baseColor: string): void`

Генерира пълна палитра от `baseColor` и я прилага към `document.documentElement` като CSS персонализирани свойства. Също така задава променлива `-rgb` за поддръжка на непрозрачност.

#### `applyThemeWithPalettes(themeKey: ThemeKey): void`

Прилага цялостна тема чрез извикване на `applyColorPalette()` за основни, вторични и акцентни цветове, плюс настройка на променливи за фон, повърхност и текст. Връща се към `everworks`, ако указаната тема е неуспешна.

#### `generateThemeCss(themeKey: ThemeKey): string`

Генерира CSS низ, съдържащ всички потребителски декларации на свойства за тема, подходящ за инжектиране в `<style>` таг или стилов лист.

#### `useThemeWithPalettes(themeKey: ThemeKey): void`

Проста обвивка, която извиква `applyThemeWithPalettes()` от страна на клиента (проверява `typeof window`). Подходящ за използване в React ефекти.

#### `applyCustomTheme(colors: { primary: string; secondary: string; accent: string }): void`

Прилага произволни цветове (не от предварително зададени теми) чрез генериране на палитри за всеки предоставен цвят.

#### `previewThemeColors(baseColor: string): void`

Помощна програма за отстраняване на грешки, която регистрира всички нюанси на палитрата в конзолата с цветен фон за визуална проверка.

### Износ от `lib/theme-utils.ts`

#### `themeClasses`

Предварително изградени карти на CSS класове на Tailwind, организирани по тип компонент:

```typescript
themeClasses.button.primary    // "bg-theme-primary hover:bg-theme-accent text-white"
themeClasses.button.secondary  // "bg-theme-secondary hover:bg-theme-secondary/80 text-white"
themeClasses.button.outline    // "border-2 border-theme-primary ..."
themeClasses.button.ghost      // "text-theme-primary hover:bg-theme-primary/10"
themeClasses.text.primary      // "text-theme-text"
themeClasses.text.secondary    // "text-theme-text-secondary"
themeClasses.text.accent       // "text-theme-primary"
themeClasses.background.*      // Background variants
themeClasses.border.*          // Border variants
```

#### `tailwindColors`

Пълен референтен обект на цветовата палитра на Tailwind CSS, съдържащ всички стандартни цветове (шисти, сиво, цинк, неутрални, камък, червено, оранжево, кехлибар, жълто, лайм, зелено, смарагд, синьозелено, циан, небесно, синьо, индиго, виолетово, лилаво, фуксия, розово, роза) с нюанси от 50 до 950.

#### `opacities`

Карта на стойността на непрозрачността от 5 до 95 като десетични знаци на низ.

#### `animationClasses`

Предварително изградени комбинации от класове на анимация: `fadeIn`, `slideIn`, `scaleIn`, `hover`, `press`.

#### `responsiveClasses`

Предварително изградени адаптивни класове за оформление: `container`, `grid.responsive`, `grid.auto`, `flex.center`, `flex.between`, `flex.start`.

#### `getCssVariable(name: string): string`

Връща `var(--name)` референтен низ за CSS променлива.

#### `withOpacity(colorClass: string, opacity: number | string): string`

Добавя модификатор за непрозрачност на задния вятър към клас (напр. `"bg-blue-500/50"`).

#### `getThemeColor(themeKey: ThemeKey, colorType: 'primary' | 'secondary'): string`

Връща шестнадесетичната стойност на цвета за конкретна тема и тип цвят.

#### `generateThemeCSS(themeKey: ThemeKey): Record<string, string>`

Връща обект с `--theme-primary` и `--theme-secondary` стойности на CSS свойства за тема.

#### `cn(...classes: (string | undefined | null | false)[]): string`

Помощна програма за условно свързване на имена на класове, филтриране на фалшиви стойности.

#### `buildThemeClasses(baseClasses: string, themeClasses: string, conditionalClasses?: Record<string, boolean>): string`

Комбинира базови класове, класове теми и условни класове в един низ от класове.

#### `THEME_PRESETS`

Прости двуцветни предварително зададени записи за всеки ключ на тема (само основен + вторичен).

### Износ от `lib/themes.tsx`

#### `ThemeMetadata` (интерфейс)

```typescript
interface ThemeMetadata {
  readonly key: ThemeKey;
  readonly label: string;
  readonly description: string;
  readonly preview: React.ReactNode;
  readonly config: ThemeConfig;
}
```

#### `ThemePreviews: Record<ThemeKey, React.ReactNode>`

React елементи, изобразяващи малки цветни миниатюри за визуализация за всяка тема.

#### `THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>>`

Метаданни на тема без конфигурация, включително етикети, описания и компоненти за визуализация.

#### `getThemeMetadata(themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata`

Обединява дефиниции на тема с конфигурация, за да създаде пълни метаданни.

#### `getAllThemeMetadata(configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[]`

Връща масив от пълни метаданни за всички теми, полезни за изобразяване на селектори на теми.

## Подробности за изпълнението

**DOM манипулиране**: `applyColorPalette()` директно модифицира `document.documentElement.style`, за да зададе потребителски свойства на CSS. Това позволява незабавно превключване на теми без презареждане на страницата.

**RGB променлива за непрозрачност**: Всяка цветова палитра задава също `--{name}-rgb` променлива, съдържаща RGB стойности, разделени със запетая (напр. `59, 130, 246`), което позволява използването на `rgba()` с непрозрачност в CSS.

**Резервна стратегия**: `applyThemeWithPalettes()` улавя грешки и се връща към темата `everworks`. Ако дори резервният вариант се провали, той записва грешката и излиза елегантно.

**Неизменни предварително зададени настройки**: `THEME_PRESETS` и `EXTENDED_THEME_CONFIGS` се декларират като `as const`, за да се предотврати случайна мутация.

## Конфигурация

Изборът на тема се управлява от контекста на `LayoutThemeContext` React. Четирите вградени теми се конфигурират директно в `EXTENDED_THEME_CONFIGS`. Персонализираните теми могат да се прилагат по време на изпълнение с помощта на `applyCustomTheme()`.

## Примери за използване

```typescript
// Apply a preset theme
import { applyThemeWithPalettes } from '@/lib/theme-color-manager';
applyThemeWithPalettes('material');

// Apply custom brand colors
import { applyCustomTheme } from '@/lib/theme-color-manager';
applyCustomTheme({
  primary: '#1a73e8',
  secondary: '#34a853',
  accent: '#ea4335',
});

// Use theme-aware utility classes
import { themeClasses, cn } from '@/lib/theme-utils';

function Button({ variant = 'primary', className, ...props }) {
  return (
    <button
      className={cn(themeClasses.button[variant], className)}
      {...props}
    />
  );
}

// Build a theme selector UI
import { getAllThemeMetadata } from '@/lib/themes';
import { EXTENDED_THEME_CONFIGS } from '@/lib/theme-color-manager';

function ThemeSelector() {
  const themes = getAllThemeMetadata(EXTENDED_THEME_CONFIGS);

  return (
    <div className={responsiveClasses.grid.responsive}>
      {themes.map((theme) => (
        <button key={theme.key} onClick={() => applyThemeWithPalettes(theme.key)}>
          {theme.preview}
          <span>{theme.label}</span>
          <p>{theme.description}</p>
        </button>
      ))}
    </div>
  );
}

// Generate theme CSS for server-side rendering
import { generateThemeCss } from '@/lib/theme-color-manager';

const css = generateThemeCss('everworks');
// Inject into <style> tag in document head
```

## Най-добри практики

- Използвайте `themeClasses` от `theme-utils.ts` за последователно оформяне на компоненти, вместо да пишете ръчно тематични класове.
- Винаги прилагайте теми чрез `applyThemeWithPalettes()`, за да сте сигурни, че всички цветови палитри (основни, вторични, акцент) и променливи без палитри (фон, повърхност, текст) са зададени заедно.
- Използвайте `generateThemeCss()` за изобразяване от страна на сървъра, за да избегнете мигане на нестилизирано съдържание, преди JavaScript от страна на клиента да приложи темата.
- Когато добавяте нова тема, актуализирайте и трите файла: `EXTENDED_THEME_CONFIGS` в `theme-color-manager.ts`, `THEME_PRESETS` в `theme-utils.ts` и `THEME_DEFINITIONS` в `themes.tsx`.
- Използвайте помощната програма `cn()` за съставяне на условен клас, за да поддържате JSX чист и четим.

## Свързани модули

- [Система за генериране на цветове](./color-generator-system) -- Математическа основа за генериране на палитри
- [Цветова система](/template/architecture/color-system) -- Преглед на цветовата система от по-високо ниво
