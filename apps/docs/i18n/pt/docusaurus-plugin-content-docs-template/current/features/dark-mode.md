---
id: dark-mode
title: Modo escuro e mudança de tema
sidebar_label: Modo escuro
sidebar_position: 25
---

# Modo escuro e troca de tema

O modelo suporta um sistema de temas de camada dupla: **modo claro/escuro** alimentado por `next-themes` e **temas de cores** (por exemplo, Everworks, Corporativo, Material, Engraçado) gerenciados por meio de um `LayoutThemeContext` personalizado. Ambos os sistemas funcionam juntos – o modo escuro alterna o esquema de cores, enquanto os temas de cores alteram as paletas primária, secundária e de destaque.

## Visão geral da arquitetura

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

## Alternar modo escuro/claro

O componente `ThemeToggler` em `components/theme-toggler.tsx` usa `next-themes` para alternar entre os modos claro e escuro:

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

| Suporte | Comportamento |
|------|----------|
| `iconOnly` | Botão de alternância único (ícone de sol/lua), usado no cabeçalho |
| `compact` | Interruptor tipo pílula para uso em linha |
| Padrão | Menu suspenso com opções Claro e Escuro |

### Hidratação Segurança

O componente retorna `null` até após a montagem (estado `mounted` ) para evitar incompatibilidades de hidratação entre servidor e cliente, já que o tema depende de `localStorage` ou de preferências do sistema que estão disponíveis apenas no cliente.

### Acessibilidade

- `aria-label` nos botões de alternância descreve o estado alvo
- `aria-expanded` e `aria-controls` no gatilho suspenso
- A tecla Escape fecha o menu suspenso
- As dicas de ferramentas de foco e foco usam `createPortal` para evitar problemas de layout

### Internacionalização

Os rótulos usam traduções `next-intl` :

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## Sistema de tema de cores

### Configuração do tema

Os temas de cores são definidos em `components/context/LayoutThemeContext.tsx` :

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

### Propriedades personalizadas CSS

Quando um tema de cores é selecionado, as propriedades personalizadas CSS são aplicadas a `document.documentElement` :

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

Os componentes fazem referência a essas variáveis por meio de classes do Tailwind como `text-theme-primary` , `bg-theme-accent` , etc.

### Persistência do tema

A seleção do tema persiste em `localStorage` e é hidratada na montagem:

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

O wrapper `safeLocalStorage` lida com erros normalmente (por exemplo, quando localStorage está desabilitado ou cheio).

### Geração de paleta de temas

A função `applyThemeWithPalettes` de `lib/theme-color-manager.ts` gera uma paleta de cores completa (tons 50 a 950) de cada cor base e as aplica como variáveis CSS. Isso habilita classes como `bg-theme-primary-100` e `text-theme-primary-800` .

## useTheme Gancho

O gancho `hooks/use-theme.ts` fornece metadados de tema e ações para a UI de configurações:

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

O mapa `THEME_INFO` inclui rótulos e descrições legíveis por humanos:

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

## Modo escuro em CSS

O modelo usa o modo escuro Tailwind CSS com a estratégia `class` . Variantes escuras são aplicadas usando o prefixo `dark:` :

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

O provedor `next-themes` adiciona uma classe `dark` ao elemento `<html>` quando o modo escuro está ativo.

## Detecção de preferência do sistema `next-themes` detecta automaticamente a preferência do esquema de cores do sistema via `prefers-color-scheme` media query. Os usuários podem substituir isso por uma seleção explícita de claro ou escuro, que persiste em `localStorage` sob a tecla `theme` .

## Pontos de Integração

O sistema de temas se conecta a diversas partes do aplicativo:

| Componente | Integração |
|-----------|------------|
| `ThemeToggler` | Alternar cabeçalho e rodapé escuro/claro |
| `SettingsModal` | UI de seleção completa de tema no painel de configurações flutuante |
| `LayoutThemeProvider` | Envolve a árvore do aplicativo, gerencia todas as preferências da IU |
| `ContainerWidthProvider` | Aninhado dentro de LayoutThemeProvider para largura do contêiner |

## Referência de arquivo

| Arquivo | Finalidade |
|------|---------|
| `components/theme-toggler.tsx` | Alternar modo escuro/claro (3 variantes) |
| `components/context/LayoutThemeContext.tsx` | Contexto do tema de cores, sincronização de variáveis ​​CSS, localStorage |
| `hooks/use-theme.ts` | Metadados do tema, temas disponíveis, manipulador de alterações |
| `lib/themes.tsx` | Componentes de visualização do tema para a IU de configurações |
| `lib/theme-color-manager.ts` | Geração completa de paleta e aplicação de variáveis ​​CSS |
| `lib/theme-utils.ts` | Funções utilitárias de tema |
