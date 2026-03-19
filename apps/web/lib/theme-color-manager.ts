/**
 * Theme Color Manager
 * Manages dynamic theme colors using the color generator
 */

import { generateColorPalette, generateCssVariables, hexToRgb } from './color-generator';
import { ThemeConfig, ThemeKey } from '@/components/context/LayoutThemeContext';

// Extended theme configurations with full color palettes
export const EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig> = {
  everworks: {
    primary: "#3d70ef",
    secondary: "#00c853",
    accent: "#0056b3",
    background: "#ffffff",
    surface: "#f8f9fa",
    text: "#1a1a1a",
    textSecondary: "#6c757d",
  },
  corporate: {
    primary: "#00c853",
    secondary: "#e74c3c",
    accent: "#34495e",
    background: "#ffffff",
    surface: "#ecf0f1",
    text: "#2c3e50",
    textSecondary: "#7f8c8d",
  },
  material: {
    primary: "#673ab7",
    secondary: "#ff9800",
    accent: "#9c27b0",
    background: "#fafafa",
    surface: "#ffffff",
    text: "#212121",
    textSecondary: "#757575",
  },
  funny: {
    primary: "#ff4081",
    secondary: "#ffeb3b",
    accent: "#e91e63",
    background: "#fff8e1",
    surface: "#ffffff",
    text: "#3e2723",
    textSecondary: "#8d6e63",
  }
};

/**
 * Applies a full color palette to the document
 * @param colorName - Name of the color variable (e.g., "theme-primary")
 * @param baseColor - Base color in hex format
 */
export function applyColorPalette(colorName: string, baseColor: string) {
  const palette = generateColorPalette(baseColor);
  const root = document.documentElement;

  // Apply the base color
  root.style.setProperty(`--${colorName}`, palette[500]);
  
  // Convert base color to RGB for opacity support
  const rgb = hexToRgb(palette[500]);
  root.style.setProperty(`--${colorName}-rgb`, `${rgb.r}, ${rgb.g}, ${rgb.b}`);

  // Apply all shades
  Object.entries(palette).forEach(([shade, color]) => {
    root.style.setProperty(`--${colorName}-${shade}`, color);
  });
}

// // Helper function to convert hex to RGB
// function hexToRgb(hex: string): { r: number; g: number; b: number } {
//   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//   return result
//     ? {
//         r: parseInt(result[1], 16),
//         g: parseInt(result[2], 16),
//         b: parseInt(result[3], 16),
//       }
//     : { r: 0, g: 0, b: 0 };
// }

/**
 * Applies all theme colors with their full palettes
 * @param themeKey - The theme key to apply
 */
export function applyThemeWithPalettes(themeKey: ThemeKey) {
  // Get theme configuration or fallback to default
  const themeToApply = EXTENDED_THEME_CONFIGS[themeKey] || EXTENDED_THEME_CONFIGS.everworks;
  
  if (!themeToApply) {
    console.error('Could not find theme configuration to apply');
    return;
  }

  try {
    // Apply primary color palette
    applyColorPalette('theme-primary', themeToApply.primary);

    // Apply secondary color palette
    applyColorPalette('theme-secondary', themeToApply.secondary);

    // Apply accent color palette
    applyColorPalette('theme-accent', themeToApply.accent);

    // Apply other theme colors (without palettes)
    const root = document.documentElement;
    root.style.setProperty('--theme-background', themeToApply.background);
    root.style.setProperty('--theme-surface', themeToApply.surface);
    root.style.setProperty('--theme-text', themeToApply.text);
    root.style.setProperty('--theme-text-secondary', themeToApply.textSecondary);
  } catch (error) {
    console.error('Error applying theme colors:', error);
    // Try to apply default theme if the requested theme failed
    if (themeKey !== 'everworks') {
      console.warn('Falling back to default theme');
      applyThemeWithPalettes('everworks');
    }
  }
}

/**
 * Generates CSS for all theme palettes
 * @param themeKey - The theme key
 * @returns CSS string with all color variables
 */
export function generateThemeCss(themeKey: ThemeKey): string {
  const theme = EXTENDED_THEME_CONFIGS[themeKey];
  const cssVariables: string[] = [];

  // Generate palettes for primary, secondary, and accent
  const primaryPalette = generateColorPalette(theme.primary);
  const secondaryPalette = generateColorPalette(theme.secondary);
  const accentPalette = generateColorPalette(theme.accent);

  // Add CSS variables
  cssVariables.push(generateCssVariables('theme-primary', primaryPalette));
  cssVariables.push(generateCssVariables('theme-secondary', secondaryPalette));
  cssVariables.push(generateCssVariables('theme-accent', accentPalette));

  // Add other theme variables
  cssVariables.push(`--theme-background: ${theme.background};`);
  cssVariables.push(`--theme-surface: ${theme.surface};`);
  cssVariables.push(`--theme-text: ${theme.text};`);
  cssVariables.push(`--theme-text-secondary: ${theme.textSecondary};`);

  return cssVariables.join('\n');
}

/**
 * Custom hook to apply theme with palettes
 */
export function useThemeWithPalettes(themeKey: ThemeKey) {
  if (typeof window !== 'undefined') {
    applyThemeWithPalettes(themeKey);
  }
}

/**
 * Example: Apply custom colors dynamically
 */
export function applyCustomTheme(colors: {
  primary: string;
  secondary: string;
  accent: string;
}) {
  applyColorPalette('theme-primary', colors.primary);
  applyColorPalette('theme-secondary', colors.secondary);
  applyColorPalette('theme-accent', colors.accent);
}

/**
 * Example: Generate a preview of theme colors
 */
export function previewThemeColors(baseColor: string) {
  const palette = generateColorPalette(baseColor);
  
  Object.entries(palette).forEach(([shade, color]) => {
    console.log(`%c ${shade}: ${color}`, `background: ${color}; color: ${parseInt(shade) >= 500 ? 'white' : 'black'}; padding: 2px 8px;`);
  });
} 