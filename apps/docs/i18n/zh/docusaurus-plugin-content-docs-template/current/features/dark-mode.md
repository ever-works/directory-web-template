---
id: dark-mode
title: 深色模式和主题切换
sidebar_label: 深色模式
sidebar_position: 25
---

# 深色模式和主题切换

该模板支持双层主题系统：**暗/亮模式**由0提供支持，以及**颜色主题**（例如，Everworks、Corporate、Material、Funny）通过自定义1进行管理。两个系统协同工作——深色模式切换配色方案，而颜色主题则更改主要、次要和强调调色板。

## 架构概述

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

## 暗/亮模式切换

1 处的 0 组件使用 2 在暗模式和亮模式之间切换：

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

### 组件变体

|道具|行为 |
|------|----------|
| 0 |单个切换按钮（太阳/月亮图标），用于标题 |
| 1 |用于串联使用的药丸式开关 |
|默认|带有浅色和深色选项的下拉菜单|

### 水合安全

该组件返回 2 直到安装后（3 状态），以防止服务器和客户端之间的水合不匹配，因为主题取决于 4 或仅在客户端可用的系统首选项。

### 辅助功能

- 切换按钮上的5描述目标状态
- 下拉触发器上的6和7
- Escape 键关闭下拉菜单
- 焦点和悬停工具提示使用8以避免布局问题

### 国际化

标签使用 9 翻译：

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## 颜色主题系统

### 主题配置

颜色主题在0中定义：

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

### CSS 自定义属性

选择颜色主题后，CSS 自定义属性将应用于 0：

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

组件通过 Tailwind 类引用这些变量，例如 0、1 等。

### 主题持久性

主题选择保持到 2 并在安装时进行水合：

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

0 包装器可以优雅地处理错误（例如，当 localStorage 被禁用或已满时）。

### 主题调色板生成

2 中的1 函数根据每种基色生成完整的调色板（色调 50 到 950），并将它们应用为 CSS 变量。这使得诸如3和4之类的类成为可能。

## 使用主题挂钩

5 挂钩为设置 UI 提供主题元数据和操作：

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

0 地图包括人类可读的标签和描述：

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

## CSS 中的深色模式

该模板使用 Tailwind CSS 深色模式和 0 策略。使用 `dark:` 前缀应用深色变体：

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

当暗模式处于活动状态时，0 提供商会向 2 元素添加 1 类。

## 系统偏好检测

3 通过4 媒体查询自动检测系统配色方案首选项。用户可以通过明确的浅色或深色选择来覆盖此设置，该选择保留在 6 键下的5 中。

## 集成点

主题系统连接到应用程序的几个部分：

|组件|整合 |
|------------|-------------|
| 7 |页眉和页脚深色/浅色切换 |
| 8 |浮动设置面板中的完整主题选择 UI |
| 9 |包装应用程序树，管理所有 UI 首选项 |
| 10 |嵌套在 LayoutThemeProvider 内以获得容器宽度 |

## 文件参考

|文件|目的|
|------|---------|
| 11 |暗/亮模式切换（3 种变体）|
| 12 |颜色主题上下文、CSS 变量同步、localStorage |
| 13 |主题元数据、可用主题、更改处理程序 |
| 14 |设置 UI 的主题预览组件 |
| 15 |完整的调色板生成和CSS变量应用|
| 16 |主题实用功能 |
