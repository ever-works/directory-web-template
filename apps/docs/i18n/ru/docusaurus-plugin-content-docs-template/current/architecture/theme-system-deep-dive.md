---
id: theme-system-deep-dive
title: "Подробное описание системы тем"
sidebar_label: "Подробное описание системы тем"
sidebar_position: 46
---

# Подробное описание системы тем

## Обзор

Система тем предоставляет комплексную многоуровневую инфраструктуру тем, которая поддерживает динамические цветовые палитры, предварительно созданные настройки тем, служебные классы CSS и метаданные темы для селекторов пользовательского интерфейса. Он включает три модуля: `theme-color-manager.ts` для приложения палитры во время выполнения, `theme-utils.ts` для служебных классов и вспомогательных функций Tailwind и `themes.tsx` для определений тем с компонентами предварительного просмотра React.

## Архитектура

Система тем накладывается поверх [Color Generator](./color-generator-system) и используется `LayoutThemeContext`:

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

Все три модуля ссылаются на `ThemeKey` и `ThemeConfig` из `@/components/context/LayoutThemeContext`, обеспечивая согласованность типов во всей системе тем.

### Доступные темы

|Ключ|Этикетка|Первичный|вторичный|
|-----|-------|---------|-----------|
|`everworks`|По умолчанию|`#3d70ef`|`#00c853`|
|`corporate`|Корпоративный|`#00c853`|`#e74c3c`|
|`material`|Материал|`#673ab7`|`#ff9800`|
|`funny`|Смешно|`#ff4081`|`#ffeb3b`|

## Справочник по API

### Экспорт из `lib/theme-color-manager.ts`

#### `EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig>`

Полные цветовые конфигурации для каждой темы, включая первичные, вторичные, акцентные, фоновые, поверхностные, текстовые и textSecondary значения.

#### `applyColorPalette(colorName: string, baseColor: string): void`

Создает полную палитру из `baseColor` и применяет ее к `document.documentElement` в качестве пользовательских свойств CSS. Также задается переменная `-rgb` для поддержки непрозрачности.

#### `applyThemeWithPalettes(themeKey: ThemeKey): void`

Применяет полную тему, вызывая `applyColorPalette()` для основных, вторичных и акцентных цветов, а также устанавливая переменные фона, поверхности и текста. Возвращается к `everworks`, если указанная тема не работает.

#### `generateThemeCss(themeKey: ThemeKey): string`

Создает строку CSS, содержащую все объявления пользовательских свойств темы, подходящую для внедрения в тег `<style>` или таблицу стилей.

#### `useThemeWithPalettes(themeKey: ThemeKey): void`

Простая оболочка, которая вызывает `applyThemeWithPalettes()` на стороне клиента (проверяет `typeof window`). Подходит для использования в эффектах React.

#### `applyCustomTheme(colors: { primary: string; secondary: string; accent: string }): void`

Применяет произвольные цвета (не из предустановленных тем), создавая палитры для каждого предоставленного цвета.

#### `previewThemeColors(baseColor: string): void`

Утилита отладки, которая записывает на консоль все оттенки палитры с цветным фоном для визуальной проверки.

### Экспорт из `lib/theme-utils.ts`

#### `themeClasses`

Предварительно созданные карты CSS-классов Tailwind, организованные по типам компонентов:

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

Полный эталонный объект цветовой палитры CSS Tailwind, содержащий все стандартные цвета (шифер, серый, цинковый, нейтральный, каменный, красный, оранжевый, янтарный, желтый, салатовый, зеленый, изумрудный, бирюзовый, голубой, небесный, синий, индиго, фиолетовый, фиолетовый, фуксия, розовый, розовый) с оттенками от 50 до 950.

#### `opacities`

Карта значений непрозрачности от 5 до 95 в виде десятичных строк.

#### `animationClasses`

Готовые комбинации классов анимации: `fadeIn`, `slideIn`, `scaleIn`, `hover`, `press`.

#### `responsiveClasses`

Предварительно созданные классы адаптивного макета: `container`, `grid.responsive`, `grid.auto`, `flex.center`, `flex.between`, `flex.start`.

#### `getCssVariable(name: string): string`

Возвращает ссылку на переменную CSS `var(--name)`.

#### `withOpacity(colorClass: string, opacity: number | string): string`

Добавляет модификатор непрозрачности Tailwind к классу (например, `"bg-blue-500/50"`).

#### `getThemeColor(themeKey: ThemeKey, colorType: 'primary' | 'secondary'): string`

Возвращает шестнадцатеричное значение цвета для определенной темы и типа цвета.

#### `generateThemeCSS(themeKey: ThemeKey): Record<string, string>`

Возвращает объект со значениями свойств CSS `--theme-primary` и `--theme-secondary` для темы.

#### `cn(...classes: (string | undefined | null | false)[]): string`

Утилита для условного объединения имен классов и фильтрации ложных значений.

#### `buildThemeClasses(baseClasses: string, themeClasses: string, conditionalClasses?: Record<string, boolean>): string`

Объединяет базовые классы, классы тем и условные классы в одну строку класса.

#### `THEME_PRESETS`

Простые двухцветные предустановленные записи для каждой клавиши темы (только основная + дополнительная).

### Экспорт из `lib/themes.tsx`

#### `ThemeMetadata` (Интерфейс)

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

Элементы React отображают небольшие цветные миниатюры предварительного просмотра для каждой темы.

#### `THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>>`

Метаданные темы без конфигурации, включая метки, описания и компоненты предварительного просмотра.

#### `getThemeMetadata(themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata`

Объединяет определения тем с конфигурацией для создания полных метаданных.

#### `getAllThemeMetadata(configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[]`

Возвращает массив полных метаданных темы для всех тем, что полезно для отрисовки селекторов тем.

## Детали реализации

**Манипулирование DOM**: `applyColorPalette()` напрямую изменяет `document.documentElement.style` для установки пользовательских свойств CSS. Это позволяет мгновенно переключать темы без перезагрузки страницы.

**Переменная RGB для непрозрачности**: каждая цветовая палитра также устанавливает переменную `--{name}-rgb`, содержащую разделенные запятыми значения RGB (например, `59, 130, 246`), что позволяет использовать `rgba()` с непрозрачностью в CSS.

**Стратегия отката**: `applyThemeWithPalettes()` обнаруживает ошибки и возвращается к теме `everworks`. Если даже резервный вариант не удался, он регистрирует ошибку и корректно завершает работу.

**Неизменяемые пресеты**: `THEME_PRESETS` и `EXTENDED_THEME_CONFIGS` объявлены `as const` для предотвращения случайной мутации.

## Конфигурация

Выбор темы управляется контекстом `LayoutThemeContext` React. Четыре встроенные темы настраиваются непосредственно в `EXTENDED_THEME_CONFIGS`. Пользовательские темы можно применять во время выполнения с помощью `applyCustomTheme()`.

## Примеры использования

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

## Лучшие практики

- Используйте `themeClasses` из `theme-utils.ts` для единообразного оформления компонентов, а не для написания классов с поддержкой тем вручную.
- Всегда применяйте темы через `applyThemeWithPalettes()`, чтобы гарантировать, что все цветовые палитры (основные, вторичные, акцентные) и переменные, не относящиеся к палитре (фон, поверхность, текст), установлены вместе.
- Используйте `generateThemeCss()` для рендеринга на стороне сервера, чтобы избежать появления нестилизованного контента до того, как клиентский JavaScript применит тему.
- При добавлении новой темы обновите все три файла: `EXTENDED_THEME_CONFIGS` в `theme-color-manager.ts`, `THEME_PRESETS` в `theme-utils.ts` и `THEME_DEFINITIONS` в `themes.tsx`.
- Используйте утилиту `cn()` для условной композиции классов, чтобы JSX был чистым и читаемым.

## Связанные модули

- [Color Generator System](./color-generator-system) — математическая основа для генерации палитр.
- [Цветовая система](/template/architecture/color-system) — обзор системы цвета более высокого уровня.
