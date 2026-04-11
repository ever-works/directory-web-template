---
id: dark-mode
title: Tryb ciemny i przełączanie motywów
sidebar_label: Tryb ciemny
sidebar_position: 25
---

# Tryb ciemny i przełączanie motywów

Szablon obsługuje dwuwarstwowy system motywów: **tryb ciemny/jasny** obsługiwany przez `next-themes` i **motywy kolorowe** (np. Everworks, Corporate, Material, Funny) zarządzane przez niestandardowy `LayoutThemeContext` . Oba systemy współpracują ze sobą — tryb ciemny przełącza schemat kolorów, podczas gdy motywy kolorów zmieniają paletę podstawową, dodatkową i akcentującą.

## Przegląd architektury

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

## Przełącznik trybu ciemnego/jasnego

Komponent `ThemeToggler` w `components/theme-toggler.tsx` używa `next-themes` do przełączania między trybami ciemnym i jasnym:

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

### Warianty komponentów

| Podpora | Zachowanie |
|------|--------------|
| `iconOnly` | Pojedynczy przycisk przełączający (ikona słońca/księżyca), używany w nagłówku |
| `compact` | Przełącznik typu pigułka do użytku inline |
| Domyślne | Rozwijane menu z opcjami Jasny i Ciemny |

### Bezpieczeństwo nawodnienia

Komponent zwraca `null` aż do momentu zamontowania (stan `mounted` ), aby zapobiec niedopasowaniu hydratacji pomiędzy serwerem a klientem, ponieważ motyw zależy od `localStorage` lub preferencji systemowych, które są dostępne tylko na kliencie.

### Dostępność

- `aria-label` na przyciskach przełączających opisuje stan docelowy
- `aria-expanded` i `aria-controls` na spuście rozwijanym
- Klawisz Escape zamyka menu rozwijane
- Etykiety narzędzi fokusu i najechania kursorem używają `createPortal` , aby uniknąć problemów z układem

### Internacjonalizacja

W etykietach zastosowano `next-intl` tłumaczenia:

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## System motywów kolorów

### Konfiguracja motywu

Motywy kolorystyczne są zdefiniowane w `components/context/LayoutThemeContext.tsx` :

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

### Właściwości niestandardowe CSS

Po wybraniu motywu kolorów niestandardowe właściwości CSS zostaną zastosowane do `document.documentElement` :

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

Komponenty odwołują się do tych zmiennych poprzez klasy Tailwind, takie jak `text-theme-primary` , `bg-theme-accent` itd.

### Trwałość motywu

Wybór motywu jest utrzymywany na poziomie `localStorage` i uwodniony na górze:

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

Opakowanie `safeLocalStorage` radzi sobie z błędami (np. gdy localStorage jest wyłączone lub pełne).

### Generowanie palety motywów

Funkcja `applyThemeWithPalettes` z `lib/theme-color-manager.ts` generuje pełną paletę kolorów (odcienie od 50 do 950) z każdego koloru bazowego i stosuje je jako zmienne CSS. Umożliwia to klasy takie jak `bg-theme-primary-100` i `text-theme-primary-800` .

## użyj haka motywu

Hook `hooks/use-theme.ts` udostępnia metadane motywu i akcje dla interfejsu ustawień:

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

Mapa `THEME_INFO` zawiera czytelne dla człowieka etykiety i opisy:

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

## Tryb ciemny w CSS

Szablon wykorzystuje ciemny tryb CSS Tailwind ze strategią `class` . Warianty ciemne stosuje się z przedrostkiem `dark:` :

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

Dostawca `next-themes` dodaje klasę `dark` do elementu `<html>` , gdy aktywny jest tryb ciemny.

## Wykrywanie preferencji systemowych `next-themes` automatycznie wykrywa preferencje schematu kolorów systemu poprzez zapytanie o media `prefers-color-scheme` . Użytkownicy mogą to zmienić poprzez wyraźny wybór jasnego lub ciemnego, który jest utrwalany w `localStorage` pod klawiszem `theme` .

## Punkty Integracyjne

System motywów łączy się z kilkoma częściami aplikacji:

| Składnik | Integracja |
|----------|------------|
| `ThemeToggler` | Przełącznik ciemnego/jasnego nagłówka i stopki |
| `SettingsModal` | Pełny interfejs wyboru motywu w pływającym panelu ustawień |
| `LayoutThemeProvider` | Owija drzewo aplikacji, zarządza wszystkimi preferencjami interfejsu użytkownika |
| `ContainerWidthProvider` | Zagnieżdżone w LayoutThemeProvider dla szerokości kontenera |

## Odniesienie do pliku

| Plik | Cel |
|------|-------------|
| `components/theme-toggler.tsx` | Przełącznik trybu ciemnego/jasnego (3 warianty) |
| `components/context/LayoutThemeContext.tsx` | Kontekst motywu kolorów, synchronizacja zmiennych CSS, localStorage |
| `hooks/use-theme.ts` | Metadane motywu, dostępne motywy, procedura obsługi zmian |
| `lib/themes.tsx` | Komponenty podglądu motywu dla interfejsu ustawień |
| `lib/theme-color-manager.ts` | Generowanie pełnej palety i aplikacja zmiennych CSS |
| `lib/theme-utils.ts` | Funkcje użytkowe motywu |
