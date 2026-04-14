---
id: theme-system
title: "Themensystem"
sidebar_label: "Themensystem"
sidebar_position: 20
---

# Themensystem

Die Vorlage bietet ein Multi-Themen-System mit vier integrierten Themen. Themes steuern Farben, CSS-Variablen und Tailwind-Dienstprogramme und umfassen Vorschaukomponenten und Metadaten für Theme-Auswahl-UIs.

## Architekturübersicht

```mermaid
graph TD
    A[LayoutThemeContext] --> B[ThemeKey]
    B --> C[THEME_DEFINITIONS]
    B --> D[EXTENDED_THEME_CONFIGS]
    B --> E[THEME_PRESETS]
    C --> F[ThemeMetadata - label, description, preview]
    D --> G[ThemeConfig - full color set]
    G --> H[theme-color-manager.ts]
    H --> I[applyThemeWithPalettes]
    I --> J[CSS Variables on :root]
    E --> K[theme-utils.ts]
    K --> L[Utility Classes]
    K --> M[Animation Classes]
    K --> N[Responsive Classes]
```

## Quelldateien

|Datei|Zweck|
|------|---------|
|`lib/themes.tsx`|Designdefinitionen, Metadaten und Vorschaukomponenten|
|`lib/theme-color-manager.ts`|Erweiterte Konfigurationen, DOM-Anwendung, CSS-Generierung|
|`lib/theme-utils.ts`|Dienstprogramme, Voreinstellungen und Hilfsfunktionen der Tailwind-Klasse|
|`components/context/LayoutThemeContext`|Reaktionskontext für Themenstatus (referenziert)|

## Verfügbare Themen

|Themenschlüssel|Etikett|Primär|Sekundär|Beschreibung|
|-----------|-------|---------|-----------|-------------|
|`everworks`|Standard|`#3d70ef`|`#00c853`|Modern und professionell mit Blau und Grün|
|`corporate`|Unternehmen|`#00c853`|`#e74c3c`|Professionelles Geschäft mit Grün und Rot|
|`material`|Material|`#673ab7`|`#ff9800`|Google Material Design mit Lila und Orange|
|`funny`|Lustig|`#ff4081`|`#ffeb3b`|Verspielt und lebendig mit Rosa und Gelb|

## Theme-Konfiguration

Jedes Thema definiert sieben Farbslots:

```typescript
export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}
```

### Erweiterte Theme-Konfigurationen

Das `EXTENDED_THEME_CONFIGS` in `theme-color-manager.ts` stellt die vollständigen Farbdefinitionen bereit:

```typescript
export const EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig> = {
  everworks: {
    primary: "#3d70ef",
    secondary: "#00c853",
    accent: "#0056b3",
    background: "#ffffff",
    surface: "#f8f9fa",
    text: "#1a1a1a",
    textSecondary: "#6c757d",
  },
  // ... other themes
};
```

## Theme-Metadaten

Das Modul `themes.tsx` stellt Anzeigemetadaten und Vorschaukomponenten bereit:

```typescript
export interface ThemeMetadata {
  readonly key: ThemeKey;
  readonly label: string;
  readonly description: string;
  readonly preview: React.ReactNode;
  readonly config: ThemeConfig;
}
```

### Themendefinitionen

```typescript
export const THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>> = {
  everworks: {
    key: "everworks",
    label: "Default",
    description: "Modern and professional theme with blue and green accents",
    preview: ThemePreviews.everworks,
  },
  // ... other themes
};
```

### Vorschau der Komponenten

Für jedes Thema gibt es eine kleine visuelle Vorschau, die als `div` gerendert wird:

```typescript
export const ThemePreviews: Record<ThemeKey, React.ReactNode> = {
  everworks: (
    <div className="w-12 h-8 bg-[#3d70ef] rounded-sm overflow-hidden relative">
      <div className="absolute inset-0 bg-linear-to-br from-white/10 to-black/10" />
      <div className="absolute bottom-1 left-1 w-2 h-1 bg-white/80 rounded-xs" />
      <div className="absolute top-1 right-1 w-1 h-1 bg-white/60 rounded-full" />
    </div>
  ),
  // ... other previews
};
```

### Metadaten-Abfragefunktionen

```typescript
// Get metadata for a single theme
export const getThemeMetadata = (themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata;

// Get metadata for all themes
export const getAllThemeMetadata = (configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[];
```

## CSS-Variablenanwendung

Wenn ein Design angewendet wird, legt der Farbmanager benutzerdefinierte CSS-Eigenschaften auf `document.documentElement` fest:

```mermaid
sequenceDiagram
    participant App
    participant Manager as theme-color-manager
    participant ColorGen as color-generator
    participant DOM

    App->>Manager: applyThemeWithPalettes('everworks')
    Manager->>Manager: Look up EXTENDED_THEME_CONFIGS
    Manager->>ColorGen: generateColorPalette(primary)
    Manager->>ColorGen: generateColorPalette(secondary)
    Manager->>ColorGen: generateColorPalette(accent)
    ColorGen-->>Manager: 11-shade palettes
    Manager->>DOM: setProperty('--theme-primary', ...)
    Manager->>DOM: setProperty('--theme-primary-50', ...)
    Manager->>DOM: setProperty('--theme-primary-rgb', ...)
    Note over DOM: 33+ CSS variables set
    Manager->>DOM: setProperty('--theme-background', ...)
    Manager->>DOM: setProperty('--theme-surface', ...)
    Manager->>DOM: setProperty('--theme-text', ...)
    Manager->>DOM: setProperty('--theme-text-secondary', ...)
```

### Generierte CSS-Variablen

Für jedes Theme werden die folgenden CSS-Variablen erstellt:

|Variables Muster|Zählen|Beispiel|
|-----------------|-------|---------|
|`--theme-primary-{50-950}`| 11 |`--theme-primary-500: #3d70ef`|
|`--theme-primary-rgb`| 1 |`--theme-primary-rgb: 61, 112, 239`|
|`--theme-secondary-{50-950}`| 11 |`--theme-secondary-500: #00c853`|
|`--theme-accent-{50-950}`| 11 |`--theme-accent-500: #0056b3`|
|`--theme-background`| 1 |`--theme-background: #ffffff`|
|`--theme-surface`| 1 |`--theme-surface: #f8f9fa`|
|`--theme-text`| 1 |`--theme-text: #1a1a1a`|
|`--theme-text-secondary`| 1 |`--theme-text-secondary: #6c757d`|

## Rückenwind-Dienstprogrammklassen

Vorgefertigte Klassenkombinationen für eine konsistente Themenverwendung:

### Button-Varianten

```typescript
themeClasses.button.primary   // "bg-theme-primary hover:bg-theme-accent text-white"
themeClasses.button.secondary // "bg-theme-secondary hover:bg-theme-secondary/80 text-white"
themeClasses.button.outline   // "border-2 border-theme-primary text-theme-primary ..."
themeClasses.button.ghost     // "text-theme-primary hover:bg-theme-primary/10"
```

### Animationskurse

```typescript
export const animationClasses = {
  fadeIn: "animate-in fade-in duration-200",
  slideIn: "animate-in slide-in-from-top-2 duration-200",
  scaleIn: "animate-in zoom-in-95 duration-200",
  hover: "transition-all duration-200 hover:scale-105",
  press: "transition-all duration-100 active:scale-95",
};
```

### Responsive Layout-Klassen

```typescript
export const responsiveClasses = {
  container: "container max-w-7xl px-4 sm:px-6 lg:px-8",
  grid: {
    responsive: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
    auto: "grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4",
  },
  flex: {
    center: "flex items-center justify-center",
    between: "flex items-center justify-between",
    start: "flex items-center justify-start",
  },
};
```

## Themenbewusster Klassenaufbau

Die Funktion `buildThemeClasses` kombiniert Basis-, Themen- und Bedingungsklassen:

```typescript
import { buildThemeClasses } from '@/lib/theme-utils';

const className = buildThemeClasses(
  'px-4 py-2 rounded',           // Base classes
  'bg-theme-primary text-white',  // Theme classes
  {
    'opacity-50 cursor-not-allowed': isDisabled,
    'ring-2 ring-theme-accent': isFocused,
  }
);
```

## Farbvoreinstellungen für Themen

Schneller Zugriff auf die Primär-/Sekundärfarben des Themas:

```typescript
export const THEME_PRESETS = {
  everworks: { primary: "#3d70ef", secondary: "#00c853" },
  corporate: { primary: "#2c3e50", secondary: "#e74c3c" },
  material: { primary: "#673ab7", secondary: "#ff9800" },
  funny: { primary: "#ff4081", secondary: "#ffeb3b" },
} as const;

// Query function
export const getThemeColor = (
  themeKey: ThemeKey,
  colorType: "primary" | "secondary"
) => colorMap[themeKey][colorType];
```

## Rückenwind-Farbreferenz

Das `theme-utils.ts`-Modul exportiert außerdem den vollständigen Satz von Tailwind-CSS-Farbwerten als `tailwindColors`-Objekt, das alle 22 Farbfamilien (Schiefer bis Rosa) mit den Farbtönen 50–950 sowie eine `opacities`-Karte von 5 % bis 95 % abdeckt.
