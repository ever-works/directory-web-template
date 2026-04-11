---
id: dark-mode
title: Donkere modus en themawisseling
sidebar_label: Donkere modus
sidebar_position: 25
---

# Donkere modus en themawisseling

De sjabloon ondersteunt een dubbellaags themasysteem: **donker/licht-modus** aangedreven door `next-themes` , en **kleurthema's** (bijvoorbeeld Everworks, Corporate, Material, Funny) beheerd via een aangepaste `LayoutThemeContext` . Beide systemen werken samen: de donkere modus schakelt tussen het kleurenschema, terwijl kleurthema's de primaire, secundaire en accentpaletten veranderen.

## Architectuuroverzicht

```
components/
  theme-toggler.tsx                     -- Dark/light mode toggle component
  context/LayoutThemeContext.tsx         -- Color theme context and provider
  settings-modal.tsx                    -- Full settings modal (includes theme)

hooks/
  use-theme.ts                          -- Theme metadata and helpers

lib/
  themes.tsx                            -- Theme preview components
  theme-color-manager.ts               -- CSS variable application
  theme-utils.ts                        -- Theme utility functions
```

## Donker/licht-modus schakelen

De component `ThemeToggler` bij `components/theme-toggler.tsx` gebruikt `next-themes` om te schakelen tussen donkere en lichte modi:

```tsx
// components/theme-toggler.tsx
import { useTheme } from "next-themes";

export function ThemeToggler({ compact, openUp, iconOnly }: ThemeTogglerProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  // Icon-only mode: single toggle button
  if (iconOnly) {
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun /> : <Moon />}
      </button>
    );
  }

  // Compact mode: pill-style toggle switch
  if (compact) {
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="relative h-10 w-20 rounded-full ..."
      >
        <span className={`transform rounded-full ${theme === "dark" ? "translate-x-11" : "translate-x-1"}`}>
          {theme === "dark" ? <Moon /> : <Sun />}
        </span>
      </button>
    );
  }

  // Default: dropdown with Light/Dark options
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        {theme === "light" ? <Sun /> : <Moon />}
      </button>
      {isOpen && (
        <div className="absolute bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl ...">
          <button onClick={() => handleThemeChange("light")}>
            <Sun /> Light
          </button>
          <button onClick={() => handleThemeChange("dark")}>
            <Moon /> Dark
          </button>
        </div>
      )}
    </div>
  );
}
```

### Componentvarianten

| Prop | Gedrag |
|------|----------|
| `iconOnly` | Enkele schakelknop (zon/maan-pictogram), gebruikt in de kop |
| `compact` | Pil-stijl schakelaar voor inline-gebruik |
| Standaard | Vervolgkeuzemenu met lichte en donkere opties |

### Hydratatieveiligheid

De component retourneert `null` tot na de mount ( `mounted` -status) om mismatches in de hydratatie tussen server en client te voorkomen, aangezien het thema afhankelijk is van `localStorage` of systeemvoorkeuren die alleen beschikbaar zijn op de client.

### Toegankelijkheid

- `aria-label` op de schakelknoppen beschrijft de doelstatus
- `aria-expanded` en `aria-controls` op de vervolgkeuzeknop
- Escape-toets sluit de vervolgkeuzelijst
- Tooltips voor scherpstellen en zweven gebruiken `createPortal` om lay-outproblemen te voorkomen

### Internationalisering

Labels gebruiken `next-intl` vertalingen:

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## Kleurthemasysteem

### Themaconfiguratie

Kleurthema's worden gedefinieerd in `components/context/LayoutThemeContext.tsx` :

```tsx
// components/context/LayoutThemeContext.tsx
export type ThemeKey = "everworks" | "corporate" | "material" | "funny";

export const THEME_CONFIGS: Record<ThemeKey, ThemeConfig> = {
  everworks: {
    primary: "#0070f3",
    secondary: "#00c853",
    accent: "#0056b3",
    background: "#ffffff",
    surface: "#f8f9fa",
    text: "#1a1a1a",
    textSecondary: "#6c757d",
  },
  corporate: {
    primary: "#2c3e50",
    secondary: "#e74c3c",
    accent: "#34495e",
    // ...
  },
  material: {
    primary: "#673ab7",
    secondary: "#ff9800",
    accent: "#9c27b0",
    // ...
  },
  funny: {
    primary: "#ff4081",
    secondary: "#ffeb3b",
    accent: "#e91e63",
    // ...
  },
};
```

### Aangepaste CSS-eigenschappen

Wanneer een kleurthema is geselecteerd, worden aangepaste CSS-eigenschappen toegepast op `document.documentElement` :

```tsx
const CSS_VARIABLES = {
  "--theme-primary": "primary",
  "--theme-secondary": "secondary",
  "--theme-accent": "accent",
  "--theme-background": "background",
  "--theme-surface": "surface",
  "--theme-text": "text",
  "--theme-text-secondary": "textSecondary",
};

const applyThemeVariables = (theme: ThemeConfig) => {
  const root = document.documentElement;
  Object.entries(CSS_VARIABLES).forEach(([cssVar, configKey]) => {
    root.style.setProperty(cssVar, theme[configKey]);
  });
};
```

Componenten verwijzen naar deze variabelen via Tailwind-klassen zoals `text-theme-primary` , `bg-theme-accent` , enz.

### Themapersistentie

Themaselectie wordt voortgezet op `localStorage` en gehydrateerd op de berg:

```tsx
const useThemeManager = () => {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>("everworks");

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem('themeKey');
    if (saved && isValidThemeKey(saved)) {
      setThemeKeyState(saved);
    }
  }, []);

  const setThemeKey = useCallback((key: ThemeKey) => {
    setThemeKeyState(key);
    safeLocalStorage.setItem('themeKey', key);
    applyThemeWithPalettes(key);
  }, []);
};
```

De wrapper `safeLocalStorage` verwerkt fouten netjes (bijvoorbeeld wanneer localStorage is uitgeschakeld of vol is).

### Generatie van themapaletten

De functie `applyThemeWithPalettes` uit `lib/theme-color-manager.ts` genereert een volledig kleurenpalet (tinten 50 tot en met 950) van elke basiskleur en past deze toe als CSS-variabelen. Hierdoor zijn klassen als `bg-theme-primary-100` en `text-theme-primary-800` mogelijk.

## gebruik Thema Hook

De `hooks/use-theme.ts` hook biedt thema-metagegevens en acties voor de instellingen-UI:

```tsx
// hooks/use-theme.ts
export const useTheme = () => {
  const { themeKey, setThemeKey, currentTheme } = useLayoutTheme();

  const currentThemeInfo = useMemo(() => THEME_INFO[themeKey], [themeKey]);
  const availableThemes = useMemo(() => Object.values(THEME_INFO), []);

  const changeTheme = useCallback((newThemeKey: ThemeKey) => {
    if (newThemeKey === themeKey) return;
    setThemeKey(newThemeKey);
  }, [themeKey, setThemeKey]);

  return {
    themeKey,
    currentTheme,
    currentThemeInfo,
    availableThemes,
    changeTheme,
    isThemeActive,
    getThemeInfo,
  };
};
```

De `THEME_INFO` -kaart bevat voor mensen leesbare labels en beschrijvingen:

```tsx
export const THEME_INFO: Record<ThemeKey, ThemeInfo> = {
  everworks: {
    key: "everworks",
    label: "Default",
    description: "Modern and professional theme with blue and green accents",
    colors: { primary: "#3d70ef", secondary: "#00c853", accent: "#0056b3", ... },
  },
  corporate: {
    key: "corporate",
    label: "Corporate",
    description: "Professional business theme with dark gray and red accents",
    colors: { ... },
  },
  // ...
};
```

## Donkere modus in CSS

De sjabloon gebruikt de donkere modus van Tailwind CSS met de `class` -strategie. Donkere varianten worden toegepast met het voorvoegsel `dark:` :

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

De `next-themes` -provider voegt een `dark` -klasse toe aan het `<html>` -element wanneer de donkere modus actief is.

## Detectie van systeemvoorkeuren `next-themes` detecteert automatisch de voorkeur voor het systeemkleurenschema via `prefers-color-scheme` mediaquery. Gebruikers kunnen dit overschrijven met een expliciete lichte of donkere selectie, die wordt bewaard in `localStorage` onder de `theme` -toets.

## Integratiepunten

Het themasysteem sluit aan op verschillende onderdelen van de applicatie:

| Onderdeel | Integratie |
|-----------|------------|
| `ThemeToggler` | Kop- en voettekst donker/licht schakelen |
| `SettingsModal` | Volledige themaselectie-UI in het zwevende instellingenpaneel |
| `LayoutThemeProvider` | Verpakt de app-boom, beheert alle UI-voorkeuren |
| `ContainerWidthProvider` | Genest in LayoutThemeProvider voor containerbreedte |

## Bestandsreferentie

| Bestand | Doel |
|------|---------|
| `components/theme-toggler.tsx` | Schakelen tussen donker/lichtmodus (3 varianten) |
| `components/context/LayoutThemeContext.tsx` | Kleurthemacontext, CSS-variabelesynchronisatie, localStorage |
| `hooks/use-theme.ts` | Thema-metagegevens, beschikbare thema's, wijzigingshandler |
| `lib/themes.tsx` | Themavoorbeeldcomponenten voor de instellingen-UI |
| `lib/theme-color-manager.ts` | Volledige paletgeneratie en toepassing van CSS-variabelen |
| `lib/theme-utils.ts` | Thema hulpprogramma's |
