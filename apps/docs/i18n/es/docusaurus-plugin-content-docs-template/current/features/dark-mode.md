---
id: dark-mode
title: Modo oscuro y cambio de tema
sidebar_label: Modo oscuro
sidebar_position: 25
---

# Modo oscuro y cambio de tema

La plantilla admite un sistema de temas de doble capa: **modo oscuro/claro** impulsado por `next-themes` y **temas de color** (por ejemplo, Everworks, Corporativo, Material, Divertido) administrados a través de un `LayoutThemeContext` personalizado. Ambos sistemas funcionan juntos: el modo oscuro alterna la combinación de colores, mientras que los temas de color cambian las paletas primaria, secundaria y de acento.

## Descripción general de la arquitectura

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

## Alternar modo oscuro/claro

El componente `ThemeToggler` en `components/theme-toggler.tsx` usa `next-themes` para cambiar entre los modos oscuro y claro:

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

### Variantes de componentes

| Apoyo | Comportamiento |
|------|----------|
| `iconOnly` | Botón de alternancia único (icono de sol/luna), utilizado en el encabezado |
| `compact` | Interruptor estilo pastilla para uso en línea |
| Predeterminado | Menú desplegable con opciones de Claro y Oscuro |

### Seguridad en la hidratación

El componente devuelve `null` hasta después del montaje (estado `mounted` ) para evitar discrepancias de hidratación entre el servidor y el cliente, ya que el tema depende de `localStorage` o preferencias del sistema que solo están disponibles en el cliente.

### Accesibilidad

- `aria-label` en los botones de alternancia describe el estado objetivo
- `aria-expanded` y `aria-controls` en el disparador desplegable
- La tecla Escape cierra el menú desplegable
- La información sobre herramientas de enfoque y desplazamiento utiliza `createPortal` para evitar problemas de diseño.

### Internacionalización

Las etiquetas utilizan traducciones `next-intl` :

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## Sistema de temas de color

### Configuración del tema

Los temas de color se definen en `components/context/LayoutThemeContext.tsx` :

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

### Propiedades personalizadas de CSS

Cuando se selecciona un tema de color, las propiedades personalizadas de CSS se aplican a `document.documentElement` :

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

Los componentes hacen referencia a estas variables a través de clases Tailwind como `text-theme-primary` , `bg-theme-accent` , etc.

### Persistencia del tema

La selección del tema persiste en `localStorage` y se hidrata en la montura:

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

El contenedor `safeLocalStorage` maneja los errores con elegancia (por ejemplo, cuando localStorage está deshabilitado o lleno).

### Generación de paleta de temas

La función `applyThemeWithPalettes` de `lib/theme-color-manager.ts` genera una paleta de colores completa (tonos 50 a 950) a partir de cada color base y los aplica como variables CSS. Esto permite clases como `bg-theme-primary-100` y `text-theme-primary-800` .

## usar gancho temático

El enlace `hooks/use-theme.ts` proporciona metadatos del tema y acciones para la interfaz de usuario de configuración:

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

El mapa `THEME_INFO` incluye etiquetas y descripciones legibles por humanos:

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

## Modo oscuro en CSS

La plantilla utiliza el modo oscuro Tailwind CSS con la estrategia `class` . Las variantes oscuras se aplican usando el prefijo `dark:` :

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

El proveedor `next-themes` agrega una clase `dark` al elemento `<html>` cuando el modo oscuro está activo.

## Detección de preferencias del sistema `next-themes` detecta automáticamente la preferencia de combinación de colores del sistema a través de `prefers-color-scheme` media query. Los usuarios pueden anular esto con una selección clara u oscura explícita, que persiste en `localStorage` debajo de la tecla `theme` .

## Puntos de integración

El sistema de temas se conecta a varias partes de la aplicación:

| Componente | Integración |
|-----------|-------------|
| `ThemeToggler` | Alternar oscuro/claro de encabezado y pie de página |
| `SettingsModal` | UI de selección completa de temas en el panel de configuración flotante |
| `LayoutThemeProvider` | Envuelve el árbol de aplicaciones, gestiona todas las preferencias de la interfaz de usuario |
| `ContainerWidthProvider` | Anidado dentro de LayoutThemeProvider para el ancho del contenedor |

## Referencia de archivo

| Archivo | Propósito |
|------|---------|
| `components/theme-toggler.tsx` | Alternar modo oscuro/claro (3 variantes) |
| `components/context/LayoutThemeContext.tsx` | Contexto del tema de color, sincronización de variables CSS, almacenamiento local |
| `hooks/use-theme.ts` | Metadatos del tema, temas disponibles, controlador de cambios |
| `lib/themes.tsx` | Componentes de vista previa del tema para la configuración de la interfaz de usuario |
| `lib/theme-color-manager.ts` | Generación de paleta completa y aplicación de variables CSS |
| `lib/theme-utils.ts` | Funciones de utilidad del tema |
