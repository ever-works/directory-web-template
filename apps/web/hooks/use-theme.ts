import {
  useLayoutTheme,
  ThemeKey,
} from "@/components/context/LayoutThemeContext";
import { useMemo, useCallback } from "react";

// Theme metadata interface
export interface ThemeInfo {
  key: ThemeKey;
  label: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
}

// Theme information with color configurations
export const THEME_INFO: Record<ThemeKey, ThemeInfo> = {
  everworks: {
    key: "everworks",
    label: "Default",
    description: "Modern and professional theme with blue and green accents",
    colors: {
      primary: "#3d70ef",
      secondary: "#00c853",
      accent: "#0056b3",
      background: "#ffffff",
      surface: "#f8f9fa",
      text: "#1a1a1a",
      textSecondary: "#6c757d",
    },
  },
  corporate: {
    key: "corporate",
    label: "Corporate",
    description: "Professional business theme with dark gray and red accents",
    colors: {
      primary: "#2c3e50",
      secondary: "#e74c3c",
      accent: "#34495e",
      background: "#ffffff",
      surface: "#ecf0f1",
      text: "#2c3e50",
      textSecondary: "#7f8c8d",
    },
  },
  material: {
    key: "material",
    label: "Material",
    description: "Google Material Design inspired theme with purple and orange",
    colors: {
      primary: "#673ab7",
      secondary: "#ff9800",
      accent: "#9c27b0",
      background: "#fafafa",
      surface: "#ffffff",
      text: "#212121",
      textSecondary: "#757575",
    },
  },
  funny: {
    key: "funny",
    label: "Funny",
    description: "Playful and vibrant theme with pink and yellow colors",
    colors: {
      primary: "#ff4081",
      secondary: "#ffeb3b",
      accent: "#e91e63",
      background: "#fff8e1",
      surface: "#ffffff",
      text: "#3e2723",
      textSecondary: "#8d6e63",
    },
  }
};

// Custom hook for theme management
export const useTheme = () => {
  const { themeKey, setThemeKey, currentTheme } = useLayoutTheme();

  // Get current theme info
  const currentThemeInfo = useMemo(() => THEME_INFO[themeKey], [themeKey]);

  // Get all available themes
  const availableThemes = useMemo(() => Object.values(THEME_INFO), []);

  // Change theme handler
  const changeTheme = useCallback(
    (newThemeKey: ThemeKey) => {
      if (newThemeKey === themeKey) return;
      setThemeKey(newThemeKey);
    },
    [themeKey, setThemeKey]
  );

  // Check if theme is active
  const isThemeActive = useCallback(
    (checkThemeKey: ThemeKey) => {
      return checkThemeKey === themeKey;
    },
    [themeKey]
  );

  // Get theme info by key
  const getThemeInfo = useCallback((key: ThemeKey) => {
    return THEME_INFO[key];
  }, []);

  return {
    // Current theme data
    themeKey,
    currentTheme,
    currentThemeInfo,

    // Available themes
    availableThemes,

    // Actions
    changeTheme,
    isThemeActive,
    getThemeInfo,
  };
};
