---
id: dark-mode
title: Dunkler Modus und Themenwechsel
sidebar_label: Dunkler Modus
sidebar_position: 25
---

# Dunkler Modus und Themenwechsel

Die Vorlage unterstützt ein zweischichtiges Themensystem: **Dunkel-/Hellmodus** mit `next-themes` und **Farbthemen** (z. B. Everworks, Corporate, Material, Funny), verwaltet über ein benutzerdefiniertes `LayoutThemeContext` . Beide Systeme arbeiten zusammen – der Dunkelmodus schaltet das Farbschema um, während Farbthemen die primäre, sekundäre und Akzentpalette ändern.

## Architekturübersicht

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

## Dunkel-/Hellmodus umschalten

Die `ThemeToggler` -Komponente bei `components/theme-toggler.tsx` nutzt `next-themes` , um zwischen Dunkel- und Hellmodus umzuschalten:

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

### Komponentenvarianten

| Stütze | Verhalten |
|------|----------|
| `iconOnly` | Einzelne Umschalttaste (Sonnen-/Mondsymbol), verwendet in der Kopfzeile |
| `compact` | Pillenschalter für den Inline-Einsatz |
| Standard | Dropdown-Menü mit Hell- und Dunkeloptionen |

### Trinksicherheit

Die Komponente gibt `null` bis nach dem Mounten ( `mounted` -Zustand) zurück, um Hydratationskonflikte zwischen Server und Client zu verhindern, da das Thema von `localStorage` oder Systemeinstellungen abhängt, die nur auf dem Client verfügbar sind.

### Barrierefreiheit

- `aria-label` auf den Umschalttasten beschreibt den Zielzustand
- `aria-expanded` und `aria-controls` auf dem Dropdown-Auslöser
- Escape-Taste schließt das Dropdown-Menü
- Fokus- und Hover-Tooltips verwenden `createPortal` , um Layoutprobleme zu vermeiden

### Internationalisierung

Beschriftungen verwenden `next-intl` Übersetzungen:

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## Farbthemensystem

### Theme-Konfiguration

Farbthemen sind in `components/context/LayoutThemeContext.tsx` definiert:

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

### Benutzerdefinierte CSS-Eigenschaften

Wenn ein Farbthema ausgewählt wird, werden benutzerdefinierte CSS-Eigenschaften auf `document.documentElement` angewendet:

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

Komponenten referenzieren diese Variablen über Tailwind-Klassen wie `text-theme-primary` , `bg-theme-accent` usw.

### Theme-Persistenz

Die Themenauswahl bleibt auf `localStorage` bestehen und wird beim Mounten hydriert:

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

Der `safeLocalStorage` -Wrapper behandelt Fehler ordnungsgemäß (z. B. wenn localStorage deaktiviert oder voll ist).

### Generierung von Themenpaletten

Die Funktion `applyThemeWithPalettes` von `lib/theme-color-manager.ts` generiert aus jeder Grundfarbe eine vollständige Farbpalette (Farbtöne 50 bis 950) und wendet sie als CSS-Variablen an. Dies ermöglicht Klassen wie `bg-theme-primary-100` und `text-theme-primary-800` .

## useTheme Hook

Der `hooks/use-theme.ts` -Hook stellt Theme-Metadaten und Aktionen für die Einstellungs-Benutzeroberfläche bereit:

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

Die `THEME_INFO` -Karte enthält für Menschen lesbare Beschriftungen und Beschreibungen:

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

## Dunkler Modus in CSS

Die Vorlage verwendet den Tailwind CSS Dark Mode mit der `class` -Strategie. Dunkle Varianten werden mit dem Präfix `dark:` angewendet:

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

Der `next-themes` -Anbieter fügt dem `<html>` -Element eine `dark` -Klasse hinzu, wenn der Dunkelmodus aktiv ist.

## Erkennung von Systemeinstellungen `next-themes` erkennt automatisch die Systemfarbschemapräferenz über `prefers-color-scheme` Medienabfrage. Benutzer können dies durch eine explizite Hell- oder Dunkelauswahl überschreiben, die in `localStorage` unter der Taste `theme` beibehalten wird.

## Integrationspunkte

Das Themensystem verbindet sich mit mehreren Teilen der Anwendung:

| Komponente | Integration |
|-----------|-------------|
| `ThemeToggler` | Kopf- und Fußzeile dunkel/hell umschalten |
| `SettingsModal` | Vollständige Benutzeroberfläche zur Themenauswahl im schwebenden Einstellungsfeld |
| `LayoutThemeProvider` | Umschließt den App-Baum und verwaltet alle UI-Einstellungen |
| `ContainerWidthProvider` | Verschachtelt in LayoutThemeProvider für Containerbreite |

## Dateireferenz

| Datei | Zweck |
|------|---------|
| `components/theme-toggler.tsx` | Umschalten zwischen Dunkel- und Hellmodus (3 Varianten) |
| `components/context/LayoutThemeContext.tsx` | Farbthemenkontext, CSS-Variablensynchronisierung, localStorage |
| `hooks/use-theme.ts` | Theme-Metadaten, verfügbare Themes, Änderungshandler |
| `lib/themes.tsx` | Theme-Vorschaukomponenten für die Einstellungs-Benutzeroberfläche |
| `lib/theme-color-manager.ts` | Vollständige Palettengenerierung und CSS-Variablenanwendung |
| `lib/theme-utils.ts` | Theme-Dienstprogrammfunktionen |
