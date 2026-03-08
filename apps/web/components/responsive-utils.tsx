"use client";

import { useEffect, useState } from "react";

// Tailwind breakpoints
export const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Hook pour détecter le breakpoint actuel
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("xs");

  useEffect(() => {
    const getBreakpoint = (): Breakpoint => {
      const width = window.innerWidth;
      
      if (width >= BREAKPOINTS["2xl"]) return "2xl";
      if (width >= BREAKPOINTS.xl) return "xl";
      if (width >= BREAKPOINTS.lg) return "lg";
      if (width >= BREAKPOINTS.md) return "md";
      if (width >= BREAKPOINTS.sm) return "sm";
      return "xs";
    };

    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return breakpoint;
}

/**
 * Hook pour vérifier si on est sur mobile
 */
export function useIsMobile() {
  const breakpoint = useBreakpoint();
  return breakpoint === "xs" || breakpoint === "sm";
}

/**
 * Hook pour vérifier si on est sur tablette
 */
export function useIsTablet() {
  const breakpoint = useBreakpoint();
  return breakpoint === "md" || breakpoint === "lg";
}

/**
 * Hook pour vérifier si on est sur desktop
 */
export function useIsDesktop() {
  const breakpoint = useBreakpoint();
  return breakpoint === "xl" || breakpoint === "2xl";
}

/**
 * Hook pour obtenir des informations détaillées sur l'appareil
 */
export function useDeviceInfo() {
  const breakpoint = useBreakpoint();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    dimensions,
    isPortrait: dimensions.height > dimensions.width,
    isLandscape: dimensions.width > dimensions.height,
  };
}

/**
 * Composant pour afficher du contenu selon le breakpoint
 */
interface ResponsiveProps {
  children: React.ReactNode;
  showOn?: Breakpoint[];
  hideOn?: Breakpoint[];
}

export function Responsive({ children, showOn, hideOn }: ResponsiveProps) {
  const breakpoint = useBreakpoint();

  if (showOn && !showOn.includes(breakpoint)) {
    return null;
  }

  if (hideOn && hideOn.includes(breakpoint)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Classes utilitaires pour la responsivité
 */
export const responsiveClasses = {
  // Responsive padding
  padding: {
    sm: "p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6",
    md: "p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8",
    lg: "p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12",
  },
  
  // Responsive margin
  margin: {
    sm: "m-2 sm:m-3 md:m-4 lg:m-5 xl:m-6",
    md: "m-3 sm:m-4 md:m-5 lg:m-6 xl:m-8",
    lg: "m-4 sm:m-6 md:m-8 lg:m-10 xl:m-12",
  },
  
  // Responsive gap
  gap: {
    sm: "gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6",
    md: "gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8",
    lg: "gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12",
  },
  
  // Responsive text
  text: {
    xs: "text-xs sm:text-sm md:text-base",
    sm: "text-sm sm:text-base md:text-lg",
    md: "text-base sm:text-lg md:text-xl lg:text-2xl",
    lg: "text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl",
    xl: "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl",
  },
  
  // Responsive grid
  grid: {
    cols1to2: "grid-cols-1 sm:grid-cols-2",
    cols1to3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    cols1to4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    cols2to4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    cols2to6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  },
  
  // Responsive container
  container: {
    sm: "max-w-(--breakpoint-sm) px-4 sm:px-6",
    md: "max-w-(--breakpoint-md) px-4 sm:px-6 lg:px-8",
    lg: "max-w-(--breakpoint-lg) px-4 sm:px-6 lg:px-8",
    xl: "max-w-(--breakpoint-xl) px-4 sm:px-6 lg:px-8",
    "2xl": "max-w-(--breakpoint-2xl) px-4 sm:px-6 lg:px-8 xl:px-10",
    full: "max-w-full px-4 sm:px-6 lg:px-8 xl:px-12",
  },
} as const; 