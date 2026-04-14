---
id: color-generator-system
title: "Sistema Gerador de Cores"
sidebar_label: "Sistema Gerador de Cores"
sidebar_position: 42
---

# Sistema Gerador de Cores

## Visão geral

O Sistema Gerador de Cores fornece geração algorítmica de paletas de cores completas (tons de 50 a 950) a partir de uma única cor hexadecimal de base. Ele lida com conversões de espaço de cores entre Hex, RGB e HSL e produz propriedades personalizadas CSS e objetos de configuração CSS Tailwind. Este módulo é a base matemática sobre a qual o sistema temático constrói suas paletas de cores dinâmicas.

## Arquitetura

O módulo (`lib/color-generator.ts`) é uma biblioteca de utilitários pura, sem efeitos colaterais e sem dependências externas. Ele fica abaixo da camada do tema e é consumido por:

- **`lib/theme-color-manager.ts`** -- Usa `generateColorPalette()` e `generateCssVariables()` para aplicar paletas de temas ao DOM.
- **Configuração do tema** – Fornece geração de configuração do Tailwind para integração do tema em tempo de construção.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## Referência de API

### Exportações

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

Converte uma string de cor hexadecimal (com ou sem prefixo `#`) em um objeto RGB. Retorna `{ r: 0, g: 0, b: 0 }` se a análise falhar.

#### `rgbToHex(r: number, g: number, b: number): string`

Converte valores inteiros RGB (0-255) em uma sequência de cores hexadecimais com o prefixo `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

Converte valores RGB (0-255) em HSL. Retorna matiz em graus (0-360), saturação e luminosidade como porcentagens (0-100).

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

Converte valores HSL (h: 0-360, s: 0-100, l: 0-100) em inteiros RGB (0-255).

#### `generateColorPalette(baseColor: string): ColorPalette`

Gera uma paleta completa de 11 tons a partir de uma cor hexadecimal base. A cor base é mapeada para a sombra `500`. Tons mais claros (50-400) aumentam a luminosidade e diminuem a saturação. Tons mais escuros (600-950) diminuem a luminosidade e aumentam a saturação.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

Gera declarações de propriedades personalizadas CSS a partir de uma paleta. Retorna uma string separada por nova linha.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

Gera um objeto de configuração de cores CSS do Tailwind que faz referência a variáveis CSS.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

O lote gera variáveis CSS e configuração do Tailwind para várias cores nomeadas de uma só vez.

## Detalhes de implementação

**Algoritmo de sombra**: A paleta é gerada ajustando a luminosidade e a saturação HSL da cor base de acordo com deslocamentos predefinidos:

|Sombra|Ajuste de luminosidade|Ajuste de saturação|
|-------|-----------------|-------------------|
| 50    | +45             | -30               |
| 100   | +40             | -25               |
| 200   | +30             | -20               |
| 300   | +20             | -10               |
| 400   | +10             | -5                |
| 500   |0 (base)|0 (base)|
| 600   | -10             | +5                |
| 700   | -20             | +10               |
| 800   | -30             | +15               |
| 900   | -40             | +20               |
| 950   | -45             | +25               |

Todos os valores calculados são limitados ao intervalo válido (0-100) para evitar estouro.

**Conversão de espaço de cores**: O módulo realiza conversões por meio do modelo de cores HSL padrão. RGB para HSL usa o algoritmo de canal mínimo/máximo e HSL para RGB usa o auxiliar hue2rgb para interpolação linear por partes.

## Configuração

Nenhuma configuração é necessária. As definições de sombra são constantes codificadas projetadas para produzir paletas visualmente equilibradas semelhantes aos padrões CSS do Tailwind.

## Exemplos de uso

```typescript
import {
  generateColorPalette,
  generateCssVariables,
  generateTailwindConfig,
  generateThemeColors,
  hexToRgb,
} from '@/lib/color-generator';

// Generate a full palette from a brand color
const palette = generateColorPalette('#3b82f6');
console.log(palette[500]); // '#3b82f6' (base)
console.log(palette[100]); // lighter shade
console.log(palette[900]); // darker shade

// Generate CSS variables for injection into <style>
const css = generateCssVariables('brand', palette);
// --brand: #3b82f6;
// --brand-50: #e8f0fe;
// ...

// Generate Tailwind config for tailwind.config.ts
const tailwind = generateTailwindConfig('brand');
// { DEFAULT: 'var(--brand)', 50: 'var(--brand-50)', ... }

// Batch generate for an entire theme
const theme = generateThemeColors({
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
});
// theme.css -- all CSS variable declarations
// theme.tailwind -- Tailwind config for all colors

// Convert colors for custom processing
const rgb = hexToRgb('#3b82f6');
// { r: 59, g: 130, b: 246 }
```

## Melhores práticas

- Use `generateColorPalette()` como fonte única para todos os valores de tonalidade em vez de escolher as cores manualmente.
- Prefira `generateCssVariables()` aos estilos embutidos para que os temas possam ser alterados dinamicamente em tempo de execução.
- Ao integrar com o Tailwind, use `generateTailwindConfig()` para que as classes de utilitários façam referência a variáveis CSS em vez de valores hexadecimais codificados.
- Sempre passe cores hexadecimais válidas de 6 dígitos (por exemplo, `#3b82f6`); hexadecimal abreviado (por exemplo, `#38f`) não é suportado pelo analisador regex.
- Teste as paletas geradas para conformidade de contraste WCAG, especialmente as extremidades claras (50-200) e escuras (800-950).

## Módulos Relacionados

- [Theme System Deep Dive](./theme-system-deep-dive) - Consome geração de paleta para temas dinâmicos
- [Sistema de cores](/template/architecture/color-system) -- Documentação do sistema de cores de nível superior
