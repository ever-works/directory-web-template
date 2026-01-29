"use client";
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { LayoutKey, layoutComponents } from "@/components/layouts";
import { applyThemeWithPalettes } from "@/lib/theme-color-manager";
import { ContainerWidthProvider } from "@/components/ui/container";

// Config defaults interface
interface ConfigDefaults {
  defaultView?: string;
}

// Constants
const DEFAULT_LAYOUT: LayoutKey = "classic";

const DEFAULT_THEME = "everworks" as const;

export enum LayoutHome {
  HOME_ONE = 'Home_One',
  HOME_TWO = 'Home_Two',
  HOME_THREE = 'Home_Three',
}

export type PaginationType = "standard" | "infinite";

export type ContainerWidth = "fixed" | "fluid";
export type DatabaseSimulationMode = "enabled" | "disabled";
export type CheckoutProvider = "stripe" | "lemonsqueezy" | "polar" | "solidgate";

const DEFAULT_DATABASE_SIMULATION_MODE: DatabaseSimulationMode = "enabled";
const DEFAULT_LAYOUT_HOME: LayoutHome = LayoutHome.HOME_ONE;
const DEFAULT_PAGINATION_TYPE: PaginationType = "standard";
const DEFAULT_CONTAINER_WIDTH: ContainerWidth = "fixed";
const DEFAULT_ITEMS_PER_PAGE = 12;
const MIN_ITEMS_PER_PAGE = 1;
const MAX_ITEMS_PER_PAGE = 100;

const STORAGE_KEYS = {
  LAYOUT: "layoutKey",
  THEME: "themeKey",
  LAYOUT_HOME: "layoutHome",
  PAGINATION_TYPE: "paginationType",
  ITEMS_PER_PAGE: "itemsPerPage",
  DATABASE_SIMULATION_MODE: "databaseSimulationMode",
  CONTAINER_WIDTH: "containerWidth",
  CHECKOUT_PROVIDER: "checkoutProvider",
  MAP_VIEW: "mapView",
} as const;

// Types
export interface ThemeConfig {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly textSecondary: string;
}

export type ThemeKey = "everworks" | "corporate" | "material" | "funny";

interface LayoutThemeContextType {
  layoutKey: LayoutKey;
  setLayoutKey: (key: LayoutKey) => void;
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
  currentTheme: ThemeConfig;
  layoutHome: LayoutHome;
  setLayoutHome: (key: LayoutHome) => void;
  paginationType: PaginationType;
  setPaginationType: (type: PaginationType) => void;
  itemsPerPage: number;
  setItemsPerPage: (itemsPerPage: number) => void;
  databaseSimulationMode: DatabaseSimulationMode;
  setDatabaseSimulationMode: (mode: DatabaseSimulationMode) => void;
  containerWidth: ContainerWidth;
  setContainerWidth: (width: ContainerWidth) => void;
  checkoutProvider: CheckoutProvider;
  setCheckoutProvider: (provider: CheckoutProvider) => void;
  configuredProviders: CheckoutProvider[];
  isMapView: boolean;
  setIsMapView: (isMap: boolean) => void;
  isInitialized: boolean;
}


// Theme configurations with readonly properties
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
} as const;

// CSS Custom Properties mapping
const CSS_VARIABLES = {
  "--theme-primary": "primary",
  "--theme-secondary": "secondary",
  "--theme-accent": "accent",
  "--theme-background": "background",
  "--theme-surface": "surface",
  "--theme-text": "text",
  "--theme-text-secondary": "textSecondary",
} as const;

// Utility functions for localStorage with error handling
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get localStorage item "${key}":`, error);
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window === "undefined") return false;
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set localStorage item "${key}":`, error);
      return false;
    }
  },
};

// Validation functions
const isValidLayoutKey = (key: string): key is LayoutKey => {
  return Object.keys(layoutComponents).includes(key);
};

const isValidThemeKey = (key: string): key is ThemeKey => {
  return key in THEME_CONFIGS;
};

const isValidLayoutHome = (key: string): key is LayoutHome => {
  return Object.values(LayoutHome).includes(key as LayoutHome);
};

const isValidPaginationType = (key: string): key is PaginationType => {
  return key === "standard" || key === "infinite";
};

const isValidContainerWidth = (key: string): key is ContainerWidth => {
  return key === "fixed" || key === "fluid";
};

const isValidItemsPerPage = (value: number): boolean => {
  return Number.isInteger(value) && value >= MIN_ITEMS_PER_PAGE && value <= MAX_ITEMS_PER_PAGE;
};

const isValidDatabaseSimulationMode = (mode: string): mode is DatabaseSimulationMode => {
  return mode === "enabled" || mode === "disabled";
};

/**
 * Detect which checkout providers are configured via environment variables
 */
const getConfiguredProviders = (): CheckoutProvider[] => {
  const providers: CheckoutProvider[] = [];

  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    providers.push("stripe");
  }

  if (typeof window !== "undefined" &&
      (process.env.NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID ||
       process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID ||
       process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID)) {
    providers.push("lemonsqueezy");
  }

  if (typeof window !== "undefined" &&
      (process.env.NEXT_PUBLIC_POLAR_FREE_PLAN_ID ||
       process.env.NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID ||
       process.env.NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID)) {
    providers.push("polar");
  }

  return providers;
};

const isValidCheckoutProvider = (provider: string): provider is CheckoutProvider => {
  return provider === "stripe" || provider === "lemonsqueezy" || provider === "polar" || provider === "solidgate";
};

// Context
const LayoutThemeContext = createContext<LayoutThemeContextType | undefined>(undefined);

// Custom hook for theme management
const useThemeManager = () => {
  // Always initialize with default to prevent hydration mismatch
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(DEFAULT_THEME);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.THEME);
    if (saved && isValidThemeKey(saved)) {
      setThemeKeyState(saved);
    }
  }, []);

  const applyThemeVariables = useCallback((theme: ThemeConfig) => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    Object.entries(CSS_VARIABLES).forEach(([cssVar, configKey]) => {
      root.style.setProperty(cssVar, theme[configKey as keyof ThemeConfig]);
    });
  }, []);

  const setThemeKey = useCallback((key: ThemeKey) => {
    if (!isValidThemeKey(key)) {
      console.warn(`Invalid theme key: ${key}`);
      return;
    }
    
    setThemeKeyState(key);
    safeLocalStorage.setItem(STORAGE_KEYS.THEME, key);
    
    // Apply theme with full color palettes
    if (typeof window !== "undefined") {
      try {
        applyThemeWithPalettes(key);
      } catch (error) {
        console.warn(`Failed to apply theme palettes for "${key}":`, error);
      }
    }
  }, []);

  // Apply theme variables when theme changes
  useEffect(() => {
    const theme = THEME_CONFIGS[themeKey];
    if (theme) {
      applyThemeVariables(theme);
      // Also apply the full color palettes
      if (typeof window !== "undefined") {
        try {
          applyThemeWithPalettes(themeKey);
        } catch (error) {
          console.warn(`Failed to apply theme palettes for "${themeKey}":`, error);
        }
      }
    }
  }, [themeKey, applyThemeVariables]);

  const currentTheme = useMemo(() => THEME_CONFIGS[themeKey], [themeKey]);

  return {
    themeKey,
    setThemeKey,
    currentTheme,
  };
};

// Custom hook for layout home management
const useLayoutHomeManager = () => {
  // Always initialize with default to prevent hydration mismatch
  const [layoutHome, setLayoutHomeState] = useState<LayoutHome>(DEFAULT_LAYOUT_HOME);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.LAYOUT_HOME);
    if (saved && isValidLayoutHome(saved)) {
      setLayoutHomeState(saved);
    }
  }, []);
  
  const setLayoutHome = useCallback((key: LayoutHome) => {
    if (!isValidLayoutHome(key)) {
      console.warn(`Invalid layout home key: ${key}`);
      return;
    }
    
    setLayoutHomeState(key);
    safeLocalStorage.setItem(STORAGE_KEYS.LAYOUT_HOME, key);
  }, []);

  return {
    layoutHome,
    setLayoutHome,
  };
};

// Custom hook for pagination type management
const usePaginationTypeManager = () => {
  // Always initialize with default to prevent hydration mismatch
  const [paginationType, setPaginationTypeState] = useState<PaginationType>(DEFAULT_PAGINATION_TYPE);

  // Hydrate from localStorage after mount - runs only once on mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.PAGINATION_TYPE);
    if (saved && isValidPaginationType(saved)) {
      setPaginationTypeState(saved);
    }
  }, []);

  const setPaginationType = useCallback((type: PaginationType) => {
    if (!isValidPaginationType(type)) {
      console.warn(`Invalid pagination type: ${type}`);
      return;
    }

    setPaginationTypeState(type);
    safeLocalStorage.setItem(STORAGE_KEYS.PAGINATION_TYPE, type);
  }, []);

  return {
    paginationType,
    setPaginationType,
  };
};

// Custom hook for items per page management
const useItemsPerPageManager = () => {
  // Always initialize with default to prevent hydration mismatch
  const [itemsPerPage, setItemsPerPageState] = useState<number>(DEFAULT_ITEMS_PER_PAGE);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.ITEMS_PER_PAGE);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (isValidItemsPerPage(parsed)) {
        setItemsPerPageState(parsed);
      }
    }
  }, []);
  
  const setItemsPerPage = useCallback((value: number) => {
    if (!isValidItemsPerPage(value)) {
      console.warn(`Invalid items per page value: ${value}. Must be between ${MIN_ITEMS_PER_PAGE} and ${MAX_ITEMS_PER_PAGE}`);
      return;
    }
    
    setItemsPerPageState(value);
    safeLocalStorage.setItem(STORAGE_KEYS.ITEMS_PER_PAGE, value.toString());
  }, []);

  return {
    itemsPerPage,
    setItemsPerPage,
  };
};

// Custom hook for database simulation mode management
const useDatabaseSimulationModeManager = () => {
  // Always initialize with default to prevent hydration mismatch
  const [databaseSimulationMode, setDatabaseSimulationModeState] = useState<DatabaseSimulationMode>(DEFAULT_DATABASE_SIMULATION_MODE);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.DATABASE_SIMULATION_MODE);
    if (saved && isValidDatabaseSimulationMode(saved)) {
      setDatabaseSimulationModeState(saved);
    }
  }, []);

  const setDatabaseSimulationMode = useCallback((mode: DatabaseSimulationMode) => {
    if (!isValidDatabaseSimulationMode(mode)) {
      console.warn(`Invalid database simulation mode: ${mode}`);
      return;
    }

    setDatabaseSimulationModeState(mode);
    safeLocalStorage.setItem(STORAGE_KEYS.DATABASE_SIMULATION_MODE, mode);
  }, []);

  return {
    databaseSimulationMode,
    setDatabaseSimulationMode,
  };
};
    
// Custom hook for container width management
const useContainerWidthManager = () => {
  // Track if we've loaded from localStorage
  const [isLoaded, setIsLoaded] = useState(false);
  // Always initialize with default to prevent hydration mismatch
  const [containerWidth, setContainerWidthState] = useState<ContainerWidth>(DEFAULT_CONTAINER_WIDTH);

  // Hydrate from localStorage after mount - run synchronously on first render
  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.CONTAINER_WIDTH);
    if (saved && isValidContainerWidth(saved)) {
      setContainerWidthState(saved);
    }
    setIsLoaded(true);
  }, []);

  const setContainerWidth = useCallback((width: ContainerWidth) => {
    if (!isValidContainerWidth(width)) {
      console.warn(`Invalid container width: ${width}`);
      return;
    }

    setContainerWidthState(width);
    safeLocalStorage.setItem(STORAGE_KEYS.CONTAINER_WIDTH, width);
  }, []);

  return {
    containerWidth,
    setContainerWidth,
    isContainerWidthLoaded: isLoaded,
  };
};

// Custom hook for checkout provider management
const useCheckoutProviderManager = () => {
  const [configuredProviders] = useState<CheckoutProvider[]>(getConfiguredProviders());

  const effectiveDefault = useMemo(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.CHECKOUT_PROVIDER);
    if (saved && isValidCheckoutProvider(saved) && configuredProviders.includes(saved)) {
      return saved;
    }
    return configuredProviders[0] || "stripe";
  }, [configuredProviders]);

  const [checkoutProvider, setCheckoutProviderState] = useState<CheckoutProvider>(effectiveDefault);

  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.CHECKOUT_PROVIDER);
    if (saved && isValidCheckoutProvider(saved) && configuredProviders.includes(saved)) {
      setCheckoutProviderState(saved);
    } else {
      setCheckoutProviderState(effectiveDefault);
    }
  }, [effectiveDefault, configuredProviders]);

  const setCheckoutProvider = useCallback((provider: CheckoutProvider) => {
    if (!isValidCheckoutProvider(provider)) {
      console.warn(`Invalid checkout provider: ${provider}`);
      return;
    }

    if (!configuredProviders.includes(provider)) {
      console.warn(`Checkout provider ${provider} is not configured`);
      return;
    }

    setCheckoutProviderState(provider);
    safeLocalStorage.setItem(STORAGE_KEYS.CHECKOUT_PROVIDER, provider);
  }, [configuredProviders]);

  return {
    checkoutProvider,
    setCheckoutProvider,
    configuredProviders,
  };
};

// Custom hook for map view management
const useMapViewManager = () => {
  const [isMapView, setIsMapViewState] = useState(false);

  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.MAP_VIEW);
    if (saved === "true") {
      setIsMapViewState(true);
    }
  }, []);

  const setIsMapView = useCallback((value: boolean) => {
    setIsMapViewState(value);
    safeLocalStorage.setItem(STORAGE_KEYS.MAP_VIEW, value.toString());
  }, []);

  return {
    isMapView,
    setIsMapView,
  };
};

// Custom hook for layout management
const useLayoutManager = (configDefaults?: ConfigDefaults) => {
  // Determine the effective default from config or fallback
  const effectiveDefault = useMemo(() => {
    if (configDefaults?.defaultView && isValidLayoutKey(configDefaults.defaultView)) {
      return configDefaults.defaultView;
    }
    return DEFAULT_LAYOUT;
  }, [configDefaults]);

  // Always initialize with default to prevent hydration mismatch
  const [layoutKey, setLayoutKeyState] = useState<LayoutKey>(effectiveDefault);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.LAYOUT);
    if (saved && isValidLayoutKey(saved)) {
      setLayoutKeyState(saved);
    } else {
      // Use config default if no localStorage value
      setLayoutKeyState(effectiveDefault);
    }
  }, [effectiveDefault]);

  const setLayoutKey = useCallback((key: LayoutKey) => {
    if (!isValidLayoutKey(key)) {
      console.warn(`Invalid layout key: ${key}`);
      return;
    }

    setLayoutKeyState(key);
    safeLocalStorage.setItem(STORAGE_KEYS.LAYOUT, key);
  }, []);

  return {
    layoutKey,
    setLayoutKey,
  };
};

// Provider props interface
interface LayoutThemeProviderProps {
  children: React.ReactNode;
  configDefaults?: ConfigDefaults;
}

// Provider component
export const LayoutThemeProvider: React.FC<LayoutThemeProviderProps> = ({ children, configDefaults }) => {
  const layoutManager = useLayoutManager(configDefaults);
  const themeManager = useThemeManager();
  const layoutHomeManager = useLayoutHomeManager();
  const paginationTypeManager = usePaginationTypeManager();
  const itemsPerPageManager = useItemsPerPageManager();
  const databaseSimulationModeManager = useDatabaseSimulationModeManager();
  const containerWidthManager = useContainerWidthManager();
  const checkoutProviderManager = useCheckoutProviderManager();
  const mapViewManager = useMapViewManager();
  const [isInitialized, setIsInitialized] = useState(false);

  // Mark as initialized after mount with delay to show skeleton and ensure stable hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 300); // Delay to show skeleton loading state and allow all localStorage reads to complete
    
    return () => clearTimeout(timer);
  }, []);

  const contextValue = useMemo(
      () => ({
        layoutKey: layoutManager.layoutKey,
        setLayoutKey: layoutManager.setLayoutKey,
        themeKey: themeManager.themeKey,
        setThemeKey: themeManager.setThemeKey,
        currentTheme: themeManager.currentTheme,
        layoutHome: layoutHomeManager.layoutHome,
        setLayoutHome: layoutHomeManager.setLayoutHome,
        paginationType: paginationTypeManager.paginationType,
        setPaginationType: paginationTypeManager.setPaginationType,
        itemsPerPage: itemsPerPageManager.itemsPerPage,
        setItemsPerPage: itemsPerPageManager.setItemsPerPage,
        databaseSimulationMode: databaseSimulationModeManager.databaseSimulationMode,
        setDatabaseSimulationMode: databaseSimulationModeManager.setDatabaseSimulationMode,
        containerWidth: containerWidthManager.containerWidth,
        setContainerWidth: containerWidthManager.setContainerWidth,
        checkoutProvider: checkoutProviderManager.checkoutProvider,
        setCheckoutProvider: checkoutProviderManager.setCheckoutProvider,
        configuredProviders: checkoutProviderManager.configuredProviders,
        isMapView: mapViewManager.isMapView,
        setIsMapView: mapViewManager.setIsMapView,
        isInitialized,
      }),
      [
        layoutManager.layoutKey,
        layoutManager.setLayoutKey,
        themeManager.themeKey,
        themeManager.setThemeKey,
        themeManager.currentTheme,
        layoutHomeManager.layoutHome,
        layoutHomeManager.setLayoutHome,
        paginationTypeManager.paginationType,
        paginationTypeManager.setPaginationType,
        itemsPerPageManager.itemsPerPage,
        itemsPerPageManager.setItemsPerPage,
        databaseSimulationModeManager.databaseSimulationMode,
        databaseSimulationModeManager.setDatabaseSimulationMode,
        containerWidthManager.containerWidth,
        containerWidthManager.setContainerWidth,
        checkoutProviderManager.checkoutProvider,
        checkoutProviderManager.setCheckoutProvider,
        checkoutProviderManager.configuredProviders,
        mapViewManager.isMapView,
        mapViewManager.setIsMapView,
        isInitialized,
      ]
    );

  return (
    <LayoutThemeContext.Provider value={contextValue}>
      <ContainerWidthProvider value={{ 
        width: containerWidthManager.containerWidth, 
        isLoaded: containerWidthManager.isContainerWidthLoaded 
      }}>
        {children}
      </ContainerWidthProvider>
    </LayoutThemeContext.Provider>
  );
};

export const useLayoutTheme = (): LayoutThemeContextType => {
  const context = useContext(LayoutThemeContext);
  
  if (!context) {
    throw new Error(
      "useLayoutTheme must be used within a LayoutThemeProvider. " +
      "Make sure to wrap your component tree with <LayoutThemeProvider>."
    );
  }
  
  return context;
};

// Utility functions
export const getThemeConfig = (themeKey: ThemeKey): ThemeConfig => {
  if (!isValidThemeKey(themeKey)) {
    console.warn(`Invalid theme key: ${themeKey}. Returning default theme.`);
    return THEME_CONFIGS[DEFAULT_THEME];
  }
  return THEME_CONFIGS[themeKey];
};

export const getAllThemes = (): Array<{ key: ThemeKey; config: ThemeConfig }> => {
  return Object.entries(THEME_CONFIGS).map(([key, config]) => ({
    key: key as ThemeKey,
    config,
  }));
};

// Additional utility functions for better developer experience
export const resetToDefaults = (): void => {
  if (typeof window === "undefined") return;

  try {
    safeLocalStorage.setItem(STORAGE_KEYS.LAYOUT, DEFAULT_LAYOUT);
    safeLocalStorage.setItem(STORAGE_KEYS.THEME, DEFAULT_THEME);
    safeLocalStorage.setItem(STORAGE_KEYS.LAYOUT_HOME, DEFAULT_LAYOUT_HOME);
    safeLocalStorage.setItem(STORAGE_KEYS.PAGINATION_TYPE, DEFAULT_PAGINATION_TYPE);
    safeLocalStorage.setItem(STORAGE_KEYS.ITEMS_PER_PAGE, DEFAULT_ITEMS_PER_PAGE.toString());
    safeLocalStorage.setItem(STORAGE_KEYS.DATABASE_SIMULATION_MODE, DEFAULT_DATABASE_SIMULATION_MODE);
    safeLocalStorage.setItem(STORAGE_KEYS.CONTAINER_WIDTH, DEFAULT_CONTAINER_WIDTH);
    safeLocalStorage.setItem(STORAGE_KEYS.MAP_VIEW, "false");
    const defaultProvider = getConfiguredProviders()[0] || "stripe";
    safeLocalStorage.setItem(STORAGE_KEYS.CHECKOUT_PROVIDER, defaultProvider);
  } catch (error) {
    console.warn("Failed to reset to defaults:", error);
  }
};

export const clearStorage = (): void => {
  if (typeof window === "undefined") return;
  
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn("Failed to clear storage:", error);
  }
};