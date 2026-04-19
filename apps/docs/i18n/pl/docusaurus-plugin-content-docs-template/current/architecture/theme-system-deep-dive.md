---
id: theme-system-deep-dive
title: "Głębokie nurkowanie w systemie tematycznym"
sidebar_label: "Głębokie nurkowanie w systemie tematycznym"
sidebar_position: 46
---

# Głębokie nurkowanie w systemie tematycznym

## Przegląd

Theme System zapewnia wszechstronną, wielowarstwową infrastrukturę tematyczną, która obsługuje dynamiczne palety kolorów, gotowe ustawienia motywów, klasy narzędzi CSS i metadane motywów dla selektorów interfejsu użytkownika. Obejmuje trzy moduły: `theme-color-manager.ts` dla aplikacji palety uruchomieniowej, `theme-utils.ts` dla klas narzędzi Tailwind i funkcji pomocniczych oraz `themes.tsx` dla definicji motywów z komponentami podglądu React.

## Architektura

System motywów jest nakładany na [Generator kolorów](./color-generator-system) i używany przez `LayoutThemeContext`:

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

Wszystkie trzy moduły odwołują się do `ThemeKey` i `ThemeConfig` z `@/components/context/LayoutThemeContext`, zapewniając spójność typów w całym systemie tematycznym.

### Dostępne motywy

|Klucz|Etykieta|Podstawowy|Drugorzędne|
|-----|-------|---------|-----------|
|`everworks`|Domyślne|`#3d70ef`|`#00c853`|
|`corporate`|Korporacyjny|`#00c853`|`#e74c3c`|
|`material`|Materiał|`#673ab7`|`#ff9800`|
|`funny`|Śmieszne|`#ff4081`|`#ffeb3b`|

## Dokumentacja API

### Eksport z `lib/theme-color-manager.ts`

#### `EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig>`

Kompletne konfiguracje kolorów dla każdego motywu, w tym wartości podstawowe, dodatkowe, akcentujące, tło, powierzchnia, tekst i tekst dodatkowy.

#### `applyColorPalette(colorName: string, baseColor: string): void`

Generuje pełną paletę z `baseColor` i stosuje ją do `document.documentElement` jako niestandardowe właściwości CSS. Ustawia również zmienną `-rgb` dla obsługi nieprzezroczystości.

#### `applyThemeWithPalettes(themeKey: ThemeKey): void`

Stosuje kompletny motyw, wywołując `applyColorPalette()` dla kolorów podstawowych, wtórnych i akcentujących, a także ustawiając zmienne tła, powierzchni i tekstu. Wraca do `everworks`, jeśli określony motyw nie powiedzie się.

#### `generateThemeCss(themeKey: ThemeKey): string`

Generuje ciąg CSS zawierający wszystkie deklaracje właściwości niestandardowych motywu, odpowiedni do wstrzyknięcia do znacznika `<style>` lub arkusza stylów.

#### `useThemeWithPalettes(themeKey: ThemeKey): void`

Prosty wrapper wywołujący `applyThemeWithPalettes()` po stronie klienta (sprawdza `typeof window`). Nadaje się do stosowania w efektach React.

#### `applyCustomTheme(colors: { primary: string; secondary: string; accent: string }): void`

Stosuje dowolne kolory (nie z gotowych motywów), generując palety dla każdego dostarczonego koloru.

#### `previewThemeColors(baseColor: string): void`

Narzędzie do debugowania, które rejestruje wszystkie odcienie palet w konsoli z kolorowym tłem w celu kontroli wizualnej.

### Eksport z `lib/theme-utils.ts`

#### `themeClasses`

Gotowe mapy klas CSS Tailwind uporządkowane według typu komponentu:

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

Kompletny obiekt referencyjny palety kolorów Tailwind CSS zawierający wszystkie standardowe kolory (łupek, szary, cynk, neutralny, kamienny, czerwony, pomarańczowy, bursztynowy, żółty, limonkowy, zielony, szmaragdowy, turkusowy, cyjan, niebo, niebieski, indygo, fioletowy, fioletowy, fuksja, różowy, różowy) w odcieniach od 50 do 950.

#### `opacities`

Mapa wartości krycia od 5 do 95 jako ciągi dziesiętne.

#### `animationClasses`

Gotowe kombinacje klas animacji: `fadeIn`, `slideIn`, `scaleIn`, `hover`, `press`.

#### `responsiveClasses`

Gotowe, responsywne klasy układu: `container`, `grid.responsive`, `grid.auto`, `flex.center`, `flex.between`, `flex.start`.

#### `getCssVariable(name: string): string`

Zwraca ciąg referencyjny zmiennej CSS `var(--name)`.

#### `withOpacity(colorClass: string, opacity: number | string): string`

Dołącza modyfikator krycia Tailwind do klasy (np. `"bg-blue-500/50"`).

#### `getThemeColor(themeKey: ThemeKey, colorType: 'primary' | 'secondary'): string`

Zwraca szesnastkową wartość koloru dla określonego motywu i typu koloru.

#### `generateThemeCSS(themeKey: ThemeKey): Record<string, string>`

Zwraca obiekt z wartościami właściwości CSS `--theme-primary` i `--theme-secondary` dla motywu.

#### `cn(...classes: (string | undefined | null | false)[]): string`

Narzędzie do warunkowego łączenia nazw klas i filtrowania fałszywych wartości.

#### `buildThemeClasses(baseClasses: string, themeClasses: string, conditionalClasses?: Record<string, boolean>): string`

Łączy klasy bazowe, klasy tematyczne i klasy warunkowe w jeden ciąg klasowy.

#### `THEME_PRESETS`

Proste, dwukolorowe, wstępnie ustawione rekordy dla każdego klawisza motywu (tylko podstawowy i dodatkowy).

### Eksport z `lib/themes.tsx`

#### `ThemeMetadata` (interfejs)

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

Reaguj na elementy renderujące małe kolorowe miniatury podglądu dla każdego motywu.

#### `THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>>`

Metadane motywu bez konfiguracji, w tym etykiety, opisy i komponenty podglądu.

#### `getThemeMetadata(themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata`

Łączy definicje motywu z konfiguracją w celu uzyskania kompletnych metadanych.

#### `getAllThemeMetadata(configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[]`

Zwraca tablicę pełnych metadanych motywu dla wszystkich motywów, przydatną do renderowania selektorów motywów.

## Szczegóły wdrożenia

**Manipulacja DOM**: `applyColorPalette()` bezpośrednio modyfikuje `document.documentElement.style`, aby ustawić niestandardowe właściwości CSS. Umożliwia to natychmiastową zmianę motywu bez konieczności przeładowywania strony.

**Zmienna RGB określająca krycie**: Każda paleta kolorów ustawia również zmienną `--{name}-rgb` zawierającą wartości RGB oddzielone przecinkami (np. `59, 130, 246`), umożliwiając użycie `rgba()` z nieprzezroczystością w CSS.

**Strategia awaryjna**: `applyThemeWithPalettes()` wychwytuje błędy i powraca do motywu `everworks`. Jeśli nawet powrót nie powiedzie się, rejestruje błąd i kończy się pomyślnie.

**Niezmienne ustawienia wstępne**: `THEME_PRESETS` i `EXTENDED_THEME_CONFIGS` są zadeklarowane jako `as const`, aby zapobiec przypadkowej mutacji.

## Konfiguracja

Wybór motywu jest zarządzany przez kontekst `LayoutThemeContext` React. Cztery wbudowane motywy są konfigurowane bezpośrednio w `EXTENDED_THEME_CONFIGS`. Niestandardowe motywy można zastosować w czasie wykonywania za pomocą `applyCustomTheme()`.

## Przykłady użycia

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

## Najlepsze praktyki

- Użyj `themeClasses` z `theme-utils.ts`, aby uzyskać spójną stylizację komponentów, zamiast ręcznie pisać klasy uwzględniające motyw.
- Zawsze stosuj motywy poprzez `applyThemeWithPalettes()`, aby mieć pewność, że wszystkie palety kolorów (podstawowe, dodatkowe, akcentujące) i zmienne niebędące paletą (tło, powierzchnia, tekst) są ustawione razem.
- Użyj `generateThemeCss()` do renderowania po stronie serwera, aby uniknąć przebłysku niestylizowanej treści, zanim JavaScript po stronie klienta zastosuje motyw.
- Dodając nowy motyw, zaktualizuj wszystkie trzy pliki: `EXTENDED_THEME_CONFIGS` w `theme-color-manager.ts`, `THEME_PRESETS` w `theme-utils.ts` i `THEME_DEFINITIONS` w `themes.tsx`.
- Użyj narzędzia `cn()` do warunkowego tworzenia klas, aby zachować przejrzystość i czytelność JSX.

## Powiązane moduły

- [System generatora kolorów](./color-generator-system) -- Matematyczne podstawy generowania palet
- [System kolorów](/template/architecture/color-system) — Omówienie wyższego poziomu systemu kolorów
