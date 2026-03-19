/**
 * Generates a complete color palette (50-950) from a base color
 */

// Converts hex color to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// Converts RGB to hex
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Converts RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Converts HSL to RGB
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Shade definitions and their characteristics
const shadeDefinitions: Record<keyof ColorPalette, { lightnessAdjust: number; saturationAdjust: number }> = {
  50: { lightnessAdjust: 45, saturationAdjust: -30 },
  100: { lightnessAdjust: 40, saturationAdjust: -25 },
  200: { lightnessAdjust: 30, saturationAdjust: -20 },
  300: { lightnessAdjust: 20, saturationAdjust: -10 },
  400: { lightnessAdjust: 10, saturationAdjust: -5 },
  500: { lightnessAdjust: 0, saturationAdjust: 0 }, // Base color
  600: { lightnessAdjust: -10, saturationAdjust: 5 },
  700: { lightnessAdjust: -20, saturationAdjust: 10 },
  800: { lightnessAdjust: -30, saturationAdjust: 15 },
  900: { lightnessAdjust: -40, saturationAdjust: 20 },
  950: { lightnessAdjust: -45, saturationAdjust: 25 },
};

export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

/**
 * Generates a complete color palette from a base color
 * @param baseColor - Base color in hex format (e.g., "#3b82f6" for blue-500)
 * @returns Object with all shades from 50 to 950
 */
export function generateColorPalette(baseColor: string): ColorPalette {
  const rgb = hexToRgb(baseColor);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  // Create an object with all required properties
  const palette: ColorPalette = {
    50: '',
    100: '',
    200: '',
    300: '',
    400: '',
    500: '',
    600: '',
    700: '',
    800: '',
    900: '',
    950: '',
  };

  // Iterate through keys in a type-safe manner
  (Object.keys(shadeDefinitions) as unknown as (keyof ColorPalette)[]).forEach((shade) => {
    const adjustments = shadeDefinitions[shade];
    let newLightness = hsl.l + adjustments.lightnessAdjust;
    let newSaturation = hsl.s + adjustments.saturationAdjust;

    // Clamp values between 0 and 100
    newLightness = Math.max(0, Math.min(100, newLightness));
    newSaturation = Math.max(0, Math.min(100, newSaturation));

    const newRgb = hslToRgb(hsl.h, newSaturation, newLightness);
    palette[shade] = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
  });

  return palette;
}

/**
 * Generates CSS variables for a color palette
 * @param variableName - CSS variable name (e.g., "theme-primary")
 * @param palette - Generated color palette
 * @returns String with all CSS variables
 */
export function generateCssVariables(variableName: string, palette: ColorPalette): string {
  const variables = [`--${variableName}: ${palette[500]};`];
  
  Object.entries(palette).forEach(([shade, color]) => {
    variables.push(`--${variableName}-${shade}: ${color};`);
  });

  return variables.join('\n');
}

/**
 * Generates Tailwind classes for a color palette
 * @param className - Class name (e.g., "theme-primary")
 * @returns Configuration object for Tailwind
 */
export function generateTailwindConfig(className: string) {
  const config: Record<string, string> = {
    DEFAULT: `var(--${className})`,
  };

  Object.keys(shadeDefinitions).forEach((shade) => {
    config[shade] = `var(--${className}-${shade})`;
  });

  return config;
}

// Usage example
export function generateThemeColors(colors: Record<string, string>) {
  const cssVariables: string[] = [];
  const tailwindConfig: Record<string, any> = {};

  Object.entries(colors).forEach(([name, baseColor]) => {
    const palette = generateColorPalette(baseColor);
    cssVariables.push(generateCssVariables(name, palette));
    tailwindConfig[name] = generateTailwindConfig(name);
  });

  return {
    css: cssVariables.join('\n'),
    tailwind: tailwindConfig,
  };
} 