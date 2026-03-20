import React from "react";
import { cn } from "@/lib/utils";
import { Container } from "./ui/container";

export interface HeroProps {
  /** Badge text displayed at the top */
  badgeText?: string;
  /** Main title */
  title?: string | React.ReactNode;
  /** Description below the title */
  description?: string | React.ReactNode;
  /** Additional classes for the main container */
  className?: string;
  /** Additional classes for the title */
  titleClassName?: string;
  /** Additional classes for the description */
  descriptionClassName?: string;
  /** Show background effects (gradients, blobs) */
  showBackgroundEffects?: boolean;
  /** Additional content to display below the description */
  children?: React.ReactNode;
}

export default function Hero({
  badgeText,
  title,
  description,
  className = "",
  titleClassName = "",
  descriptionClassName = "",
  showBackgroundEffects: _showBackgroundEffects = true,
  children,
}: HeroProps) {
  return (
    <section
      aria-label="Hero"
      className={cn(
        "w-full bg-white dark:bg-[#0a0a0a] relative pt-8 sm:pt-12",
        className
      )}
    >
      {/* Main Content */}
      <div className="relative z-10 w-full">
        {/* Header Section - Title and description */}
        <div className="pt-0 pb-0">
          <Container maxWidth="7xl" padding="default">
            {/* Introducing badge */}
            {badgeText && (
              <div className="flex items-center justify-center mb-2 sm:mb-3">
                <div className="flex items-center text-gray-900 dark:text-gray-200 bg-gray-200 dark:bg-white/4 py-0.5 px-3 sm:py-1 sm:px-3 rounded-full gap-1.5 text-[11px] font-medium dark:border-white/6 border border-gray-200/50">
                  <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                  {badgeText}
                </div>
              </div>
            )}

            {title && (
              <h1
                className={cn(
                  "text-xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 px-4",
                  titleClassName
                )}
              >
                {title}
              </h1>
            )}

            {description && (
              <p
                className={cn(
                  "text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed transition-colors duration-300 px-4 sm:px-0",
                  descriptionClassName
                )}
              >
                {description}
              </p>
            )}
          </Container>
        </div>
        
        {/* Children section - rendered outside the header Container to allow full-width in fluid mode */}
        {children && (
          <div className="mt-4 sm:mt-6">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
