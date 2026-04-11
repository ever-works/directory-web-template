---
id: dark-mode
title: Modalità oscura e cambio tema
sidebar_label: Modalità oscura
sidebar_position: 25
---

# Modalità oscura e cambio tema

Il modello supporta un sistema di temi a doppio livello: **modalità scuro/chiaro** gestito da `next-themes` e **temi colore** (ad esempio Everworks, Corporate, Material, Funny) gestiti tramite un `LayoutThemeContext` personalizzato. Entrambi i sistemi funzionano insieme: la modalità oscura attiva/disattiva la combinazione di colori, mentre i temi di colore modificano le tavolozze primarie, secondarie e di accento.

## Panoramica dell'architettura

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

## Attiva/disattiva modalità Buio/Luce

Il componente `ThemeToggler` in `components/theme-toggler.tsx` utilizza `next-themes` per passare dalla modalità scura a quella chiara:

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

### Varianti dei componenti

| Prop | Comportamento |
|------|----------|
| `iconOnly` | Pulsante di commutazione singolo (icona sole/luna), utilizzato nell'intestazione |
| `compact` | Interruttore a pillola per uso in linea |
| Predefinito | Menu a discesa con opzioni Chiaro e Scuro |

### Sicurezza dell'idratazione

Il componente restituisce `null` fino a dopo il montaggio (stato `mounted` ) per evitare discrepanze di idratazione tra server e client, poiché il tema dipende da `localStorage` o dalle preferenze di sistema disponibili solo sul client.

### Accessibilità

- `aria-label` sui pulsanti di attivazione/disattivazione descrive lo stato target
- `aria-expanded` e `aria-controls` sul grilletto a discesa
- Il tasto Escape chiude il menu a discesa
- I suggerimenti per la messa a fuoco e il passaggio del mouse utilizzano `createPortal` per evitare problemi di layout

### Internazionalizzazione

Le etichette utilizzano le traduzioni `next-intl` :

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## Sistema di temi a colori

### Configurazione del tema

I temi colore sono definiti in `components/context/LayoutThemeContext.tsx` :

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

### Proprietà personalizzate CSS

Quando viene selezionato un tema colore, le proprietà personalizzate CSS vengono applicate a `document.documentElement` :

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

I componenti fanno riferimento a queste variabili tramite classi Tailwind come `text-theme-primary` , `bg-theme-accent` , ecc.

### Persistenza del tema

La selezione del tema viene mantenuta su `localStorage` e idratata sulla cavalcatura:

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

Il wrapper `safeLocalStorage` gestisce gli errori in modo corretto (ad esempio, quando localStorage è disabilitato o pieno).

### Generazione della tavolozza dei temi

La funzione `applyThemeWithPalettes` di `lib/theme-color-manager.ts` genera una tavolozza di colori completa (tonalità da 50 a 950) da ciascun colore di base e la applica come variabili CSS. Ciò consente classi come `bg-theme-primary-100` e `text-theme-primary-800` .

## usaTheme Hook

L'hook `hooks/use-theme.ts` fornisce metadati del tema e azioni per l'interfaccia utente delle impostazioni:

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

La mappa `THEME_INFO` include etichette e descrizioni leggibili dall'uomo:

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

## Modalità oscura nei CSS

Il modello utilizza la modalità dark Tailwind CSS con la strategia `class` . Le varianti scure vengono applicate utilizzando il prefisso `dark:` :

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

Il provider `next-themes` aggiunge una classe `dark` all'elemento `<html>` quando la modalità oscura è attiva.

## Rilevamento delle preferenze di sistema `next-themes` rileva automaticamente la preferenza della combinazione di colori del sistema tramite `prefers-color-scheme` media query. Gli utenti possono ignorare questa impostazione con una selezione esplicita di chiaro o scuro, che viene mantenuta in `localStorage` sotto il tasto `theme` .

## Punti di integrazione

Il sistema di temi si collega a diverse parti dell'applicazione:

| Componente | Integrazione |
|-----------|-------------|
| `ThemeToggler` | Attiva/disattiva intestazione e piè di pagina scuro/chiaro |
| `SettingsModal` | Interfaccia utente completa per la selezione del tema nel pannello delle impostazioni mobile |
| `LayoutThemeProvider` | Avvolge l'albero delle app, gestisce tutte le preferenze dell'interfaccia utente |
| `ContainerWidthProvider` | Nidificato all'interno di LayoutThemeProvider per la larghezza del contenitore |

## Riferimento al file

| File | Scopo |
|------|---------|
| `components/theme-toggler.tsx` | Commutazione modalità buio/luce (3 varianti) |
| `components/context/LayoutThemeContext.tsx` | Contesto del tema colore, sincronizzazione delle variabili CSS, localStorage |
| `hooks/use-theme.ts` | Metadati del tema, temi disponibili, gestore delle modifiche |
| `lib/themes.tsx` | Componenti di anteprima del tema per l'interfaccia utente delle impostazioni |
| `lib/theme-color-manager.ts` | Generazione completa di tavolozze e applicazione di variabili CSS |
| `lib/theme-utils.ts` | Funzioni di utilità del tema |
