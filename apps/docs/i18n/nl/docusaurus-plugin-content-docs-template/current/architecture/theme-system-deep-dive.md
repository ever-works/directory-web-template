---
id: theme-system-deep-dive
title: "Themasysteem Deep Dive"
sidebar_label: "Themasysteem Deep Dive"
sidebar_position: 46
---

# Themasysteem Deep Dive

## Overzicht

Het Theme System biedt een uitgebreide, meerlaagse thema-infrastructuur die dynamische kleurenpaletten, vooraf gebouwde themavoorinstellingen, CSS-hulpprogrammaklassen en thema-metagegevens voor UI-selectors mogelijk maakt. Het omvat drie modules: `theme-color-manager.ts` voor runtime-palettoepassingen, `theme-utils.ts` voor Tailwind-hulpprogrammaklassen en helperfuncties, en `themes.tsx` voor themadefinities met React-previewcomponenten.

## Architectuur

Het themasysteem is gelaagd bovenop de [Color Generator](./color-generator-system) en wordt gebruikt door de `LayoutThemeContext`:

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

Alle drie de modules verwijzen naar `ThemeKey` en `ThemeConfig` van `@/components/context/LayoutThemeContext`, waardoor typeconsistentie in het hele themasysteem wordt gegarandeerd.

### Beschikbare thema's

|Sleutel|Etiket|Primair|Secundair|
|-----|-------|---------|-----------|
|`everworks`|Standaard|`#3d70ef`|`#00c853`|
|`corporate`|Zakelijk|`#00c853`|`#e74c3c`|
|`material`|Materiaal|`#673ab7`|`#ff9800`|
|`funny`|Grappig|`#ff4081`|`#ffeb3b`|

## API-referentie

### Exporteert vanuit `lib/theme-color-manager.ts`

#### `EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig>`

Volledige kleurconfiguraties voor elk thema, inclusief primaire, secundaire, accent-, achtergrond-, oppervlak-, tekst- en textSecondary-waarden.

#### `applyColorPalette(colorName: string, baseColor: string): void`

Genereert een volledig palet van `baseColor` en past dit toe op `document.documentElement` als aangepaste CSS-eigenschappen. Stelt ook een `-rgb` variabele in voor dekkingsondersteuning.

#### `applyThemeWithPalettes(themeKey: ThemeKey): void`

Past een compleet thema toe door `applyColorPalette()` aan te roepen voor primaire, secundaire en accentkleuren, plus het instellen van achtergrond-, oppervlakte- en tekstvariabelen. Valt terug naar `everworks` als het opgegeven thema mislukt.

#### `generateThemeCss(themeKey: ThemeKey): string`

Genereert een CSS-tekenreeks met alle aangepaste eigenschapsdeclaraties voor een thema, geschikt voor injectie in een `<style>` tag of stylesheet.

#### `useThemeWithPalettes(themeKey: ThemeKey): void`

Een eenvoudige wrapper die `applyThemeWithPalettes()` aanroept aan de clientzijde (controleert `typeof window`). Geschikt voor gebruik in React-effecten.

#### `applyCustomTheme(colors: { primary: string; secondary: string; accent: string }): void`

Past willekeurige kleuren toe (niet van vooraf ingestelde thema's) door paletten te genereren voor elke opgegeven kleur.

#### `previewThemeColors(baseColor: string): void`

Debug-hulpprogramma dat alle paletkleuren met gekleurde achtergronden in de console registreert voor visuele inspectie.

### Exporteert vanuit `lib/theme-utils.ts`

#### `themeClasses`

Vooraf gebouwde Tailwind CSS-klassekaarten, gerangschikt op componenttype:

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

Compleet Tailwind CSS-kleurenpaletreferentieobject met alle standaardkleuren (leisteen, grijs, zink, neutraal, steen, rood, oranje, amber, geel, limoen, groen, smaragd, groenblauw, cyaan, hemel, blauw, indigo, violet, paars, fuchsia, roze, roze) met tinten 50 tot en met 950.

#### `opacities`

De dekkingswaarde wordt toegewezen van 5 tot 95 als tekenreeksdecimalen.

#### `animationClasses`

Vooraf gemaakte combinaties van animatieklassen: `fadeIn`, `slideIn`, `scaleIn`, `hover`, `press`.

#### `responsiveClasses`

Vooraf gebouwde responsieve lay-outklassen: `container`, `grid.responsive`, `grid.auto`, `flex.center`, `flex.between`, `flex.start`.

#### `getCssVariable(name: string): string`

Retourneert een `var(--name)` CSS-variabele referentietekenreeks.

#### `withOpacity(colorClass: string, opacity: number | string): string`

Voegt de Tailwind-dekkingsmodifier toe aan een klasse (bijvoorbeeld `"bg-blue-500/50"`).

#### `getThemeColor(themeKey: ThemeKey, colorType: 'primary' | 'secondary'): string`

Retourneert de hexadecimale kleurwaarde voor een specifiek thema en kleurtype.

#### `generateThemeCSS(themeKey: ThemeKey): Record<string, string>`

Retourneert een object met `--theme-primary` en `--theme-secondary` CSS-eigenschapswaarden voor een thema.

#### `cn(...classes: (string | undefined | null | false)[]): string`

Hulpprogramma om klassenamen voorwaardelijk samen te voegen en valse waarden uit te filteren.

#### `buildThemeClasses(baseClasses: string, themeClasses: string, conditionalClasses?: Record<string, boolean>): string`

Combineert basisklassen, themaklassen en voorwaardelijke klassen in één klassenreeks.

#### `THEME_PRESETS`

Eenvoudige tweekleurige vooraf ingestelde records voor elke thematoets (alleen primair + secundair).

### Exporteert vanuit `lib/themes.tsx`

#### `ThemeMetadata` (Interface)

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

Reageer-elementen met kleine gekleurde voorbeeldminiaturen voor elk thema.

#### `THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>>`

Thema-metagegevens zonder configuratie, inclusief labels, beschrijvingen en voorbeeldcomponenten.

#### `getThemeMetadata(themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata`

Voegt themadefinities samen met een configuratie om volledige metadata te produceren.

#### `getAllThemeMetadata(configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[]`

Retourneert een reeks volledige thema-metagegevens voor alle thema's, handig voor het weergeven van themakiezers.

## Implementatiedetails

**DOM-manipulatie**: `applyColorPalette()` wijzigt rechtstreeks `document.documentElement.style` om aangepaste CSS-eigenschappen in te stellen. Hierdoor kunt u direct van thema wisselen zonder dat de pagina opnieuw hoeft te worden geladen.

**RGB-variabele voor dekking**: elk kleurenpalet stelt ook een `--{name}-rgb` variabele in die door komma's gescheiden RGB-waarden bevat (bijvoorbeeld `59, 130, 246`), waardoor `rgba()` gebruik met dekking in CSS mogelijk wordt.

**Fallback-strategie**: `applyThemeWithPalettes()` vangt fouten op en valt terug naar het `everworks`-thema. Als zelfs de fallback mislukt, wordt de fout geregistreerd en netjes afgesloten.

**Onveranderlijke presets**: `THEME_PRESETS` en `EXTENDED_THEME_CONFIGS` worden gedeclareerd als `as const` om onbedoelde mutatie te voorkomen.

## Configuratie

Themaselectie wordt beheerd door de `LayoutThemeContext` React-context. De vier ingebouwde thema's worden rechtstreeks in `EXTENDED_THEME_CONFIGS` geconfigureerd. Aangepaste thema's kunnen tijdens runtime worden toegepast met `applyCustomTheme()`.

## Gebruiksvoorbeelden

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

## Beste praktijken

- Gebruik `themeClasses` van `theme-utils.ts` voor een consistente componentstijl in plaats van handmatig themabewuste klassen te schrijven.
- Pas thema's altijd toe via `applyThemeWithPalettes()` om ervoor te zorgen dat alle kleurenpaletten (primair, secundair, accent) en niet-paletvariabelen (achtergrond, oppervlak, tekst) samen worden ingesteld.
- Gebruik `generateThemeCss()` voor weergave op de server om een flits van ongestylede inhoud te voorkomen voordat JavaScript op de client het thema toepast.
- Wanneer u een nieuw thema toevoegt, werkt u alle drie de bestanden bij: `EXTENDED_THEME_CONFIGS` in `theme-color-manager.ts`, `THEME_PRESETS` in `theme-utils.ts` en `THEME_DEFINITIONS` in `themes.tsx`.
- Gebruik het hulpprogramma `cn()` voor het samenstellen van voorwaardelijke klassen om JSX schoon en leesbaar te houden.

## Gerelateerde modules

- [Color Generator System](./color-generator-system) -- Wiskundige basis voor het genereren van paletten
- [Kleursysteem](/template/architecture/color-system) -- Overzicht van het kleursysteem op een hoger niveau
