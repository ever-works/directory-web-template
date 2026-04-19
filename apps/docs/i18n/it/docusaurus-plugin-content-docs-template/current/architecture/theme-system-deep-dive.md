---
id: theme-system-deep-dive
title: "Approfondimento del sistema tematico"
sidebar_label: "Approfondimento del sistema tematico"
sidebar_position: 46
---

# Approfondimento del sistema tematico

## Panoramica

Il sistema di temi fornisce un'infrastruttura tematica completa e multilivello che alimenta tavolozze di colori dinamiche, preimpostazioni di temi predefinite, classi di utilità CSS e metadati di temi per i selettori dell'interfaccia utente. Si estende su tre moduli: `theme-color-manager.ts` per l'applicazione della tavolozza runtime, `theme-utils.ts` per le classi di utilità Tailwind e le funzioni di supporto e `themes.tsx` per le definizioni di temi con componenti di anteprima di React.

## Architettura

Il sistema dei temi è sovrapposto al [Generatore di colori](./color-generator-system) e utilizzato da `LayoutThemeContext`:

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

Tutti e tre i moduli fanno riferimento a `ThemeKey` e `ThemeConfig` da `@/components/context/LayoutThemeContext`, garantendo la coerenza dei tipi in tutto il sistema dei temi.

### Temi disponibili

|Chiave|Etichetta|Primario|Secondario|
|-----|-------|---------|-----------|
|`everworks`|Predefinito|`#3d70ef`|`#00c853`|
|`corporate`|Aziendale|`#00c853`|`#e74c3c`|
|`material`|Materiale|`#673ab7`|`#ff9800`|
|`funny`|Divertente|`#ff4081`|`#ffeb3b`|

## Riferimento API

### Esportazioni da `lib/theme-color-manager.ts`

#### `EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig>`

Configurazioni di colore complete per ogni tema, inclusi i valori primari, secondari, accenti, sfondo, superficie, testo e textSecondary.

#### `applyColorPalette(colorName: string, baseColor: string): void`

Genera una tavolozza completa da `baseColor` e la applica a `document.documentElement` come proprietà personalizzate CSS. Imposta anche una variabile `-rgb` per il supporto dell'opacità.

#### `applyThemeWithPalettes(themeKey: ThemeKey): void`

Applica un tema completo chiamando `applyColorPalette()` per i colori primari, secondari e accentati, oltre a impostare variabili di sfondo, superficie e testo. Ritorna a `everworks` se il tema specificato fallisce.

#### `generateThemeCss(themeKey: ThemeKey): string`

Genera una stringa CSS contenente tutte le dichiarazioni di proprietà personalizzate per un tema, adatta per l'inserimento in un tag o foglio di stile `<style>`.

#### `useThemeWithPalettes(themeKey: ThemeKey): void`

Un semplice wrapper che chiama `applyThemeWithPalettes()` sul lato client (controlla `typeof window`). Adatto per l'uso negli effetti React.

#### `applyCustomTheme(colors: { primary: string; secondary: string; accent: string }): void`

Applica colori arbitrari (non da temi preimpostati) generando tavolozze per ciascun colore fornito.

#### `previewThemeColors(baseColor: string): void`

Utilità di debug che registra tutte le sfumature della tavolozza sulla console con sfondi colorati per l'ispezione visiva.

### Esportazioni da `lib/theme-utils.ts`

#### `themeClasses`

Mappe di classi CSS Tailwind predefinite organizzate per tipo di componente:

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

Oggetto di riferimento completo della tavolozza dei colori CSS Tailwind contenente tutti i colori standard (ardesia, grigio, zinco, neutro, pietra, rosso, arancione, ambra, giallo, lime, verde, smeraldo, verde acqua, ciano, cielo, blu, indaco, viola, viola, fucsia, rosa, rosa) con sfumature da 50 a 950.

#### `opacities`

Mappa dei valori di opacità da 5 a 95 come decimali di stringa.

#### `animationClasses`

Combinazioni di classi di animazione predefinite: `fadeIn`, `slideIn`, `scaleIn`, `hover`, `press`.

#### `responsiveClasses`

Classi di layout reattive predefinite: `container`, `grid.responsive`, `grid.auto`, `flex.center`, `flex.between`, `flex.start`.

#### `getCssVariable(name: string): string`

Restituisce una stringa di riferimento della variabile CSS `var(--name)`.

#### `withOpacity(colorClass: string, opacity: number | string): string`

Aggiunge il modificatore di opacità Tailwind a una classe (ad esempio, `"bg-blue-500/50"`).

#### `getThemeColor(themeKey: ThemeKey, colorType: 'primary' | 'secondary'): string`

Restituisce il valore esadecimale del colore per un tema e un tipo di colore specifici.

#### `generateThemeCSS(themeKey: ThemeKey): Record<string, string>`

Restituisce un oggetto con i valori delle proprietà CSS `--theme-primary` e `--theme-secondary` per un tema.

#### `cn(...classes: (string | undefined | null | false)[]): string`

Utilità per unire in modo condizionale i nomi delle classi, filtrando i valori falsi.

#### `buildThemeClasses(baseClasses: string, themeClasses: string, conditionalClasses?: Record<string, boolean>): string`

Combina classi base, classi di temi e classi condizionali in un'unica stringa di classe.

#### `THEME_PRESETS`

Semplici record preimpostati a due colori per ciascuna chiave del tema (solo primario + secondario).

### Esportazioni da `lib/themes.tsx`

#### `ThemeMetadata` (Interfaccia)

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

Elementi React che riproducono piccole miniature di anteprima colorate per ciascun tema.

#### `THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>>`

Metadati del tema senza configurazione, incluse etichette, descrizioni e componenti di anteprima.

#### `getThemeMetadata(themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata`

Unisce le definizioni dei temi con una configurazione per produrre metadati completi.

#### `getAllThemeMetadata(configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[]`

Restituisce una serie di metadati completi per tutti i temi, utili per il rendering dei selettori di temi.

## Dettagli di implementazione

**Manipolazione DOM**: `applyColorPalette()` modifica direttamente `document.documentElement.style` per impostare le proprietà personalizzate CSS. Ciò consente il cambio istantaneo del tema senza ricaricare la pagina.

**Variabile RGB per l'opacità**: ciascuna tavolozza di colori imposta anche una variabile `--{name}-rgb` contenente valori RGB separati da virgole (ad esempio, `59, 130, 246`), consentendo l'utilizzo di `rgba()` con opacità nei CSS.

**Strategia di fallback**: `applyThemeWithPalettes()` rileva gli errori e torna al tema `everworks`. Se anche il fallback fallisce, registra l'errore ed esce normalmente.

**Preimpostazioni immutabili**: `THEME_PRESETS` e `EXTENDED_THEME_CONFIGS` sono dichiarati `as const` per evitare mutazioni accidentali.

## Configurazione

La selezione del tema è gestita dal contesto `LayoutThemeContext` React. I quattro temi integrati sono configurati direttamente in `EXTENDED_THEME_CONFIGS`. I temi personalizzati possono essere applicati in fase di runtime utilizzando `applyCustomTheme()`.

## Esempi di utilizzo

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

## Migliori pratiche

- Utilizza `themeClasses` da `theme-utils.ts` per uno stile coerente dei componenti anziché scrivere manualmente classi basate sul tema.
- Applica sempre i temi tramite `applyThemeWithPalettes()` per garantire che tutte le tavolozze dei colori (primari, secondari, accenti) e le variabili non tavolozza (sfondo, superficie, testo) siano impostate insieme.
- Utilizza `generateThemeCss()` per il rendering lato server per evitare un flash di contenuto senza stile prima che JavaScript lato client applichi il tema.
- Quando aggiungi un nuovo tema, aggiorna tutti e tre i file: `EXTENDED_THEME_CONFIGS` in `theme-color-manager.ts`, `THEME_PRESETS` in `theme-utils.ts` e `THEME_DEFINITIONS` in `themes.tsx`.
- Utilizzare l'utilità `cn()` per la composizione delle classi condizionali per mantenere JSX pulito e leggibile.

## Moduli correlati

- [Color Generator System](./color-generator-system) -- Fondamenti matematici per la generazione della tavolozza
- [Sistema colore](/template/architecture/color-system) -- Panoramica del sistema colore di livello superiore
