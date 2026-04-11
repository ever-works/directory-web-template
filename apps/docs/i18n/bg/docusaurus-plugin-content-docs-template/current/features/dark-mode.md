---
id: dark-mode
title: Тъмен режим и превключване на теми
sidebar_label: Тъмен режим
sidebar_position: 25
---

# Тъмен режим и превключване на теми

Шаблонът поддържа двуслойна тематична система: **тъмен/светъл режим**, захранван от `next-themes` , и **цветни теми** (напр. Everworks, Corporate, Material, Funny), управлявани чрез персонализиран `LayoutThemeContext` . И двете системи работят заедно -- тъмният режим превключва цветовата схема, докато цветовите теми променят основните, вторичните и акцентните палитри.

## Преглед на архитектурата

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

## Превключване на тъмен/светъл режим

Компонентът `ThemeToggler` в `components/theme-toggler.tsx` използва `next-themes` за превключване между тъмен и светъл режим:

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

### Варианти на компоненти

| опора | Поведение |
|------|----------|
| `iconOnly` | Един бутон за превключване (икона на слънце/луна), използван в заглавката |
| `compact` | Превключвател в стил хапче за вградена употреба |
| По подразбиране | Падащо меню със светли и тъмни опции |

### Безопасност на хидратацията

Компонентът връща `null` до след монтиране ( `mounted` състояние), за да предотврати несъответствия на хидратация между сървър и клиент, тъй като темата зависи от `localStorage` или системни предпочитания, които са налични само на клиента.

### Достъпност

- `aria-label` на бутоните за превключване описва целевото състояние
- `aria-expanded` и `aria-controls` на спусъка за падащо меню
- Клавишът Escape затваря падащото меню
- Подсказките за фокусиране и задържане на мишката използват `createPortal` , за да избегнат проблеми с оформлението

### Интернационализация

Етикетите използват `next-intl` превода:

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## Система за цветни теми

### Конфигурация на тема

Цветовите теми са дефинирани в `components/context/LayoutThemeContext.tsx` :

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

### CSS персонализирани свойства

Когато е избрана цветова тема, CSS персонализирани свойства се прилагат към `document.documentElement` :

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

Компонентите препращат към тези променливи чрез класове Tailwind като `text-theme-primary` , `bg-theme-accent` и т.н.

### Устойчивост на темата

Изборът на тема се запазва до `localStorage` и се хидратира при монтиране:

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

Обвивката `safeLocalStorage` обработва грешките елегантно (напр. когато localStorage е деактивирано или пълно).

### Генериране на тематична палитра

Функцията `applyThemeWithPalettes` от `lib/theme-color-manager.ts` генерира пълна цветова палитра (нюанси от 50 до 950) от всеки основен цвят и ги прилага като CSS променливи. Това позволява класове като `bg-theme-primary-100` и `text-theme-primary-800` .

## useTheme Hook

Куката `hooks/use-theme.ts` предоставя метаданни на темата и действия за потребителския интерфейс на настройките:

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

Картата `THEME_INFO` включва четими от човека етикети и описания:

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

## Тъмен режим в CSS

Шаблонът използва тъмен режим Tailwind CSS със стратегия `class` . Тъмните варианти се прилагат с помощта на префикса `dark:` :

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

Доставчикът `next-themes` добавя клас `dark` към елемента `<html>` , когато е активен тъмен режим.

## Откриване на системни предпочитания `next-themes` автоматично открива предпочитанията за цветова схема на системата чрез `prefers-color-scheme` медийно запитване. Потребителите могат да отменят това с явен избор на светло или тъмно, което се запазва в `localStorage` под клавиша `theme` .

## Интеграционни точки

Темата се свързва с няколко части на приложението:

| Компонент | Интеграция |
|-----------|-------------|
| `ThemeToggler` | Горен и долен колонтитул Превключване между тъмно/светло |
| `SettingsModal` | Пълен потребителски интерфейс за избор на тема в плаващия панел с настройки |
| `LayoutThemeProvider` | Обгръща дървото на приложенията, управлява всички предпочитания на потребителския интерфейс |
| `ContainerWidthProvider` | Вложено в LayoutThemeProvider за ширина на контейнер |

## Референтен файл

| Файл | Цел |
|------|---------|
| `components/theme-toggler.tsx` | Превключване на тъмен/светъл режим (3 варианта) |
| `components/context/LayoutThemeContext.tsx` | Контекст на цветна тема, синхронизиране на CSS променливи, localStorage |
| `hooks/use-theme.ts` | Метаданни на темата, налични теми, манипулатор на промени |
| `lib/themes.tsx` | Компоненти за визуализация на тема за потребителския интерфейс на настройките |
| `lib/theme-color-manager.ts` | Генериране на пълна палитра и приложение на CSS променлива |
| `lib/theme-utils.ts` | Помощни функции на тема |
