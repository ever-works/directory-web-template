---
id: dark-mode
title: Темный режим и переключение тем
sidebar_label: Темный режим
sidebar_position: 25
---

# Темный режим и переключение тем

Шаблон поддерживает двухуровневую систему тем: **тёмный/светлый режим** на базе `next-themes` и **цветовые темы** (например, Everworks, Corporate, Material, Funny), управляемые с помощью пользовательской `LayoutThemeContext` . Обе системы работают вместе: темный режим переключает цветовую схему, а цветовые темы меняют основную, вторичную и акцентную палитры.

## Обзор архитектуры

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

## Переключение темного/светлого режима

Компонент `ThemeToggler` в позиции `components/theme-toggler.tsx` использует `next-themes` для переключения между темным и светлым режимами:

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

### Варианты компонентов

| Опора | Поведение |
|------|----------|
| `iconOnly` | Одна кнопка переключения (значок солнца/луны), используемая в заголовке |
| `compact` | Переключатель в виде таблеток для встроенного использования |
| По умолчанию | Выпадающее меню с опциями «Светлый» и «Темный» |

### Безопасность гидратации

Компонент возвращает `null` до момента монтирования (состояние `mounted` ), чтобы предотвратить несоответствие гидратации между сервером и клиентом, поскольку тема зависит от `localStorage` или системных настроек, которые доступны только на клиенте.

### Доступность

- `aria-label` на кнопках переключения описывает целевое состояние
- `aria-expanded` и `aria-controls` на кнопке раскрывающегося списка.
- Клавиша Escape закрывает раскрывающийся список.
- Подсказки для фокусировки и наведения используют `createPortal` , чтобы избежать проблем с макетом.

### Интернационализация

В ярлыках используется перевод `next-intl` :

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## Система цветовых тем

### Конфигурация темы

Цветовые темы определены в `components/context/LayoutThemeContext.tsx` :

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

### Пользовательские свойства CSS

Когда выбрана цветовая тема, пользовательские свойства CSS применяются к `document.documentElement` :

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

Компоненты ссылаются на эти переменные через классы Tailwind, такие как `text-theme-primary` , `bg-theme-accent` и т. д.

### Сохранение темы

Выбор темы сохраняется до `localStorage` и гидратируется при монтировании:

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

Обертка `safeLocalStorage` корректно обрабатывает ошибки (например, когда localStorage отключен или заполнен).

### Генерация палитры тем

Функция `applyThemeWithPalettes` из `lib/theme-color-manager.ts` генерирует полную цветовую палитру (оттенки от 50 до 950) из каждого базового цвета и применяет их как переменные CSS. Это позволяет использовать такие классы, как `bg-theme-primary-100` и `text-theme-primary-800` .

## useTheme Hook

Хук `hooks/use-theme.ts` предоставляет метаданные темы и действия для пользовательского интерфейса настроек:

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

Карта `THEME_INFO` включает удобочитаемые метки и описания:

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

## Темный режим в CSS

В шаблоне используется темный режим Tailwind CSS со стратегией `class` . Темные варианты применяются с использованием префикса `dark:` :

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

Поставщик `next-themes` добавляет класс `dark` к элементу `<html>` , когда темный режим активен.

## Обнаружение системных предпочтений `next-themes` автоматически определяет предпочтения цветовой схемы системы с помощью медиа-запроса `prefers-color-scheme` . Пользователи могут отменить это, выбрав явный светлый или темный цвет, который сохраняется в `localStorage` под клавишей `theme` .

## Точки интеграции

Система тем соединяется с несколькими частями приложения:

| Компонент | Интеграция |
|-----------|-------------|
| `ThemeToggler` | Переключение темного/светлого верхнего и нижнего колонтитула |
| `SettingsModal` | Полный пользовательский интерфейс выбора темы на плавающей панели настроек |
| `LayoutThemeProvider` | Обертывает дерево приложений, управляет всеми настройками пользовательского интерфейса |
| `ContainerWidthProvider` | Вложен внутри LayoutThemeProvider для ширины контейнера |

## Ссылка на файл

| Файл | Цель |
|------|---------|
| `components/theme-toggler.tsx` | Переключение темного/светлого режима (3 варианта) |
| `components/context/LayoutThemeContext.tsx` | Контекст цветовой темы, синхронизация переменных CSS, localStorage |
| `hooks/use-theme.ts` | Метаданные темы, доступные темы, обработчик изменений |
| `lib/themes.tsx` | Компоненты предварительного просмотра темы для пользовательского интерфейса настроек |
| `lib/theme-color-manager.ts` | Полная генерация палитры и применение переменных CSS |
| `lib/theme-utils.ts` | Полезные функции темы |
