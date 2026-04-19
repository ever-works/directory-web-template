---
id: theme-system-deep-dive
title: "Aprofundamento do sistema temático"
sidebar_label: "Aprofundamento do sistema temático"
sidebar_position: 46
---

# Aprofundamento do sistema temático

## Visão geral

O Theme System fornece uma infraestrutura de temas abrangente e multicamadas que alimenta paletas de cores dinâmicas, predefinições de temas pré-construídas, classes de utilitários CSS e metadados de temas para seletores de UI. Ele abrange três módulos: `theme-color-manager.ts` para aplicativo de paleta de tempo de execução, `theme-utils.ts` para classes de utilitários e funções auxiliares do Tailwind e `themes.tsx` para definições de tema com componentes de visualização do React.

## Arquitetura

O sistema de tema é colocado em camadas sobre o [Gerador de cores](./color-generator-system) e consumido pelo `LayoutThemeContext`:

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

Todos os três módulos fazem referência a `ThemeKey` e `ThemeConfig` de `@/components/context/LayoutThemeContext`, garantindo consistência de tipo em todo o sistema de tema.

### Temas disponíveis

|Chave|Etiqueta|Primário|Secundário|
|-----|-------|---------|-----------|
|`everworks`|Padrão|`#3d70ef`|`#00c853`|
|`corporate`|Corporativo|`#00c853`|`#e74c3c`|
|`material`|Materiais|`#673ab7`|`#ff9800`|
|`funny`|Engraçado|`#ff4081`|`#ffeb3b`|

## Referência de API

### Exportações de `lib/theme-color-manager.ts`

#### `EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig>`

Configurações completas de cores para cada tema, incluindo valores primários, secundários, de destaque, de fundo, de superfície, de texto e textSecondary.

#### `applyColorPalette(colorName: string, baseColor: string): void`

Gera uma paleta completa de `baseColor` e aplica-a a `document.documentElement` como propriedades personalizadas CSS. Também define uma variável `-rgb` para suporte à opacidade.

#### `applyThemeWithPalettes(themeKey: ThemeKey): void`

Aplica um tema completo chamando `applyColorPalette()` para cores primárias, secundárias e de destaque, além de definir variáveis de plano de fundo, superfície e texto. Volta para `everworks` se o tema especificado falhar.

#### `generateThemeCss(themeKey: ThemeKey): string`

Gera uma string CSS contendo todas as declarações de propriedades personalizadas para um tema, adequada para injeção em uma tag ou folha de estilo `<style>`.

#### `useThemeWithPalettes(themeKey: ThemeKey): void`

Um wrapper simples que chama `applyThemeWithPalettes()` no lado do cliente (verifica `typeof window`). Adequado para uso em efeitos React.

#### `applyCustomTheme(colors: { primary: string; secondary: string; accent: string }): void`

Aplica cores arbitrárias (não de temas predefinidos) gerando paletas para cada cor fornecida.

#### `previewThemeColors(baseColor: string): void`

Utilitário de depuração que registra todos os tons da paleta no console com fundos coloridos para inspeção visual.

### Exportações de `lib/theme-utils.ts`

#### `themeClasses`

Mapas de classes CSS Tailwind pré-construídos organizados por tipo de componente:

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

Objeto de referência completo da paleta de cores CSS do Tailwind contendo todas as cores padrão (ardósia, cinza, zinco, neutro, pedra, vermelho, laranja, âmbar, amarelo, limão, verde, esmeralda, verde-azulado, ciano, céu, azul, índigo, violeta, roxo, fúcsia, rosa, rosa) com tons de 50 a 950.

#### `opacities`

Mapa de valores de opacidade de 5 a 95 como strings decimais.

#### `animationClasses`

Combinações de classes de animação pré-construídas: `fadeIn`, `slideIn`, `scaleIn`, `hover`, `press`.

#### `responsiveClasses`

Classes de layout responsivo pré-construídas: `container`, `grid.responsive`, `grid.auto`, `flex.center`, `flex.between`, `flex.start`.

#### `getCssVariable(name: string): string`

Retorna uma string de referência de variável CSS `var(--name)`.

#### `withOpacity(colorClass: string, opacity: number | string): string`

Acrescenta o modificador de opacidade Tailwind a uma classe (por exemplo, `"bg-blue-500/50"`).

#### `getThemeColor(themeKey: ThemeKey, colorType: 'primary' | 'secondary'): string`

Retorna o valor hexadecimal da cor para um tema e tipo de cor específicos.

#### `generateThemeCSS(themeKey: ThemeKey): Record<string, string>`

Retorna um objeto com valores de propriedade CSS `--theme-primary` e `--theme-secondary` para um tema.

#### `cn(...classes: (string | undefined | null | false)[]): string`

Utilitário para unir condicionalmente nomes de classes, filtrando valores falsos.

#### `buildThemeClasses(baseClasses: string, themeClasses: string, conditionalClasses?: Record<string, boolean>): string`

Combina classes base, classes temáticas e classes condicionais em uma única string de classe.

#### `THEME_PRESETS`

Registros predefinidos simples de duas cores para cada chave de tema (somente primário + secundário).

### Exportações de `lib/themes.tsx`

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

Elementos React renderizando pequenas miniaturas coloridas para cada tema.

#### `THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>>`

Metadados do tema sem configuração, incluindo rótulos, descrições e componentes de visualização.

#### `getThemeMetadata(themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata`

Mescla definições de tema com uma configuração para produzir metadados completos.

#### `getAllThemeMetadata(configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[]`

Retorna uma matriz de metadados completos de temas para todos os temas, úteis para renderizar seletores de temas.

## Detalhes de implementação

**Manipulação de DOM**: `applyColorPalette()` modifica diretamente `document.documentElement.style` para definir propriedades personalizadas de CSS. Isso permite a troca instantânea de tema sem recarregar a página.

**Variável RGB para opacidade**: cada paleta de cores também define uma variável `--{name}-rgb` contendo valores RGB separados por vírgula (por exemplo, `59, 130, 246`), permitindo o uso de `rgba()` com opacidade em CSS.

**Estratégia de fallback**: `applyThemeWithPalettes()` detecta erros e recorre ao tema `everworks`. Se até mesmo o substituto falhar, ele registra o erro e sai normalmente.

**Predefinições imutáveis**: `THEME_PRESETS` e `EXTENDED_THEME_CONFIGS` são declarados `as const` para evitar mutação acidental.

## Configuração

A seleção do tema é gerenciada pelo contexto `LayoutThemeContext` React. Os quatro temas integrados são configurados diretamente em `EXTENDED_THEME_CONFIGS`. Temas personalizados podem ser aplicados em tempo de execução usando `applyCustomTheme()`.

## Exemplos de uso

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

## Melhores práticas

- Use `themeClasses` de `theme-utils.ts` para um estilo de componente consistente em vez de escrever classes com reconhecimento de tema manualmente.
- Sempre aplique temas por meio de `applyThemeWithPalettes()` para garantir que todas as paletas de cores (primária, secundária, destaque) e variáveis que não sejam da paleta (fundo, superfície, texto) sejam definidas juntas.
- Use `generateThemeCss()` para renderização no lado do servidor para evitar um flash de conteúdo sem estilo antes que o JavaScript do lado do cliente aplique o tema.
- Ao adicionar um novo tema, atualize todos os três arquivos: `EXTENDED_THEME_CONFIGS` em `theme-color-manager.ts`, `THEME_PRESETS` em `theme-utils.ts` e `THEME_DEFINITIONS` em `themes.tsx`.
- Use o utilitário `cn()` para composição de classe condicional para manter JSX limpo e legível.

## Módulos Relacionados

- [Sistema Gerador de Cores](./color-generator-system) - Base matemática para geração de paleta
- [Sistema de cores](/template/architecture/color-system) -- Visão geral do sistema de cores de nível superior
