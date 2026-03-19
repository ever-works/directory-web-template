import React from "react";
import { ThemeConfig, ThemeKey } from "@/components/context/LayoutThemeContext";

// Theme metadata for UI display
export interface ThemeMetadata {
  readonly key: ThemeKey;
  readonly label: string;
  readonly description: string;
  readonly preview: React.ReactNode;
  readonly config: ThemeConfig;
}

// Theme preview components
export const ThemePreviews: Record<ThemeKey, React.ReactNode> = {
  everworks: (
    <div className="w-12 h-8 bg-[#3d70ef] rounded-sm overflow-hidden relative">
      <div className="absolute inset-0 bg-linear-to-br from-white/10 to-black/10"></div>
      <div className="absolute bottom-1 left-1 w-2 h-1 bg-white/80 rounded-xs"></div>
      <div className="absolute top-1 right-1 w-1 h-1 bg-white/60 rounded-full"></div>
    </div>
  ),
  corporate: (
    <div className="w-12 h-8 bg-[#00c853] rounded-sm overflow-hidden relative">
      <div className="absolute inset-0 bg-linear-to-br from-white/10 to-black/10"></div>
      <div className="absolute bottom-1 left-1 w-2 h-1 bg-white/80 rounded-xs"></div>
      <div className="absolute top-1 right-1 w-1 h-1 bg-white/60 rounded-full"></div>
    </div>
  ),
  material: (
    <div className="w-12 h-8 bg-[#673ab7] rounded-sm overflow-hidden relative">
      <div className="absolute inset-0 bg-linear-to-br from-white/10 to-black/10"></div>
      <div className="absolute bottom-1 left-1 w-2 h-1 bg-white/80 rounded-xs"></div>
      <div className="absolute top-1 right-1 w-1 h-1 bg-white/60 rounded-full"></div>
    </div>
  ),
  funny: (
    <div className="w-12 h-8 bg-[#ff4081] rounded-sm overflow-hidden relative">
      <div className="absolute inset-0 bg-linear-to-br from-white/10 to-black/10"></div>
      <div className="absolute bottom-1 left-1 w-2 h-1 bg-white/80 rounded-xs"></div>
      <div className="absolute top-1 right-1 w-1 h-1 bg-white/60 rounded-full"></div>
    </div>
  )
};

// Complete theme definitions
export const THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>> = {
  everworks: {
    key: "everworks",
    label: "Default",
    description: "Modern and professional theme with blue and green accents",
    preview: ThemePreviews.everworks,
  },
  corporate: {
    key: "corporate",
    label: "Corporate",
    description: "Professional business theme with dark gray and red accents",
    preview: ThemePreviews.corporate,
  },
  material: {
    key: "material",
    label: "Material",
    description: "Google Material Design inspired theme with purple and orange",
    preview: ThemePreviews.material,
  },
  funny: {
    key: "funny",
    label: "Funny",
    description: "Playful and vibrant theme with pink and yellow colors",
    preview: ThemePreviews.funny,
  }
};

// Utility to get complete theme metadata
export const getThemeMetadata = (themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata => {
  const definition = THEME_DEFINITIONS[themeKey];
  return {
    ...definition,
    config,
  };
};

// Get all theme metadata
export const getAllThemeMetadata = (configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[] => {
  return Object.keys(THEME_DEFINITIONS).map(key => 
    getThemeMetadata(key as ThemeKey, configs[key as ThemeKey])
  );
}; 