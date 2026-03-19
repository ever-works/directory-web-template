"use client";

import { forwardRef, HTMLAttributes, createContext, useContext } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Re-export ContainerWidth type for convenience
export type ContainerWidth = "fixed" | "fluid";

// Context value includes both width and loaded state
interface ContainerWidthContextValue {
  width: ContainerWidth;
  isLoaded: boolean;
}

// Create a separate context for container width to avoid circular dependencies
// This will be set by the main LayoutThemeProvider
const ContainerWidthContext = createContext<ContainerWidthContextValue>({ 
  width: "fixed", 
  isLoaded: false 
});

export const ContainerWidthProvider = ContainerWidthContext.Provider;

// Returns the container width - returns actual value for smooth transitions
export const useContainerWidth = () => {
  const { width } = useContext(ContainerWidthContext);
  return width;
};

// Hook to get the loaded state (for transition timing)
export const useContainerWidthLoaded = () => {
  const { isLoaded } = useContext(ContainerWidthContext);
  return isLoaded;
};

/**
 * Container variants configuration using class-variance-authority
 * Provides consistent spacing and max-width options across the application
 */
const containerVariants = cva(
  // Base styles applied to all containers
  "w-full mx-auto",
  {
    variants: {
      /**
       * Maximum width variants
       * @default "7xl"
       */
      maxWidth: {
        sm: "max-w-(--breakpoint-sm)",     // 640px
        md: "max-w-(--breakpoint-md)",     // 768px
        lg: "max-w-(--breakpoint-lg)",     // 1024px
        xl: "max-w-(--breakpoint-xl)",     // 1280px
        "2xl": "max-w-(--breakpoint-2xl)", // 1536px
        "7xl": "max-w-7xl",        // 1280px (Tailwind default)
        full: "max-w-full",        // 100%
        none: "",                  // No max-width constraint
      },
      /**
       * Padding variants for responsive spacing
       * @default "default"
       */
      padding: {
        none: "",
        sm: "px-2 sm:px-4",
        default: "px-4 sm:px-6 lg:px-8",
        lg: "px-6 sm:px-8 lg:px-12",
        xl: "px-8 sm:px-12 lg:px-16",
      },
      /**
       * Centering behavior
       * @default true
       */
      centered: {
        true: "mx-auto",
        false: "",
      },
    },
    defaultVariants: {
      maxWidth: "7xl",
      padding: "default",
      centered: true,
    },
  }
);


export interface ContainerProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  /**
   * HTML tag to render as container
   * @default "div"
   */
  as?: "div" | "section" | "article" | "main" | "aside" | "nav";
  /**
   * Enable fluid container behavior
   * When true, the container will have a fluid width with max-width constraints
   * @default false
   */
  fluid?: boolean;
  /**
   * Use global container width setting from LayoutThemeContext
   * When true, the container will respect the user's width preference (fixed/fluid)
   * @default false
   */
  useGlobalWidth?: boolean;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      as: Component = "div",
      className,
      maxWidth,
      padding,
      centered,
      fluid = false,
      useGlobalWidth = false,
      children,
      ...props
    },
    ref
  ) => {
    // Get global container width setting from context (defaults to "fixed" if not in provider)
    const globalContainerWidth = useContainerWidth();
    const isLoaded = useContainerWidthLoaded();
    
    // Determine if we should use fluid mode
    const isFluid = useGlobalWidth ? globalContainerWidth === "fluid" : fluid;
    
    // Override maxWidth to 'none' when fluid is true
    const effectiveMaxWidth = isFluid ? "none" : maxWidth;
    
    // Use smaller padding in fluid mode to maximize screen usage, but respect explicit "none" padding
    const effectivePadding = padding === "none" ? "none" : (isFluid ? "sm" : padding);

    return (
      <Component
        ref={ref}
        className={cn(
          containerVariants({
            maxWidth: effectiveMaxWidth,
            padding: effectivePadding,
            centered,
          }),
          // For containers using global width: fade in after settings load to prevent flash
          useGlobalWidth && "transition-opacity duration-150",
          useGlobalWidth && !isLoaded && "opacity-0",
          useGlobalWidth && isLoaded && "opacity-100",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Container.displayName = "Container";

/**
 * Preset container variants for common use cases
 */
export const PageContainer = forwardRef<
  HTMLDivElement,
  Omit<ContainerProps, "as">
>((props, ref) => (
  <Container ref={ref} as="main" maxWidth="7xl" useGlobalWidth {...props} />
));

PageContainer.displayName = "PageContainer";

export const SectionContainer = forwardRef<
  HTMLDivElement,
  Omit<ContainerProps, "as">
>((props, ref) => (
  <Container ref={ref} as="section" useGlobalWidth {...props} />
));

SectionContainer.displayName = "SectionContainer";

export const ArticleContainer = forwardRef<
  HTMLDivElement,
  Omit<ContainerProps, "as">
>((props, ref) => (
  <Container ref={ref} as="article" maxWidth="lg" {...props} />
));

ArticleContainer.displayName = "ArticleContainer";

/**
 * Hook to get container classes programmatically
 * Useful for applying container styles to custom components
 * 
 * @example
 * ```tsx
 * const containerClasses = useContainerClasses({ maxWidth: 'lg', padding: 'lg' });
 * ```
 */
export const useContainerClasses = (
  props?: VariantProps<typeof containerVariants>
) => {
  return containerVariants(props);
};

/**
 * Export the variants for external use
 * Allows other components to reuse the same variant configuration
 */
export { containerVariants };
