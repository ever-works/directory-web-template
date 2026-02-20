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
        "w-full min-h-screen bg-white dark:bg-[#0b111f] relative",
        className
      )}
    >
      {/* Main Content */}
      <div className="relative z-10 w-full">
        {/* Header Section - Title and description */}
        <div className="pt-2 pb-1 sm:pt-10 sm:pb-2">
          <Container maxWidth="7xl" padding="default">
            {/* Introducing badge */}
            {badgeText && (
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <div className="flex items-center text-gray-900 dark:text-gray-200 bg-gray-200 dark:bg-[#1F2937]/50 py-1 px-4 sm:py-1.5 sm:px-4 rounded-full gap-2 text-xs sm:text-sm font-medium  dark:border-gray-700/50 border border-gray-200/50">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                {badgeText}
                </div>
              </div>
            )}

            {title && (
              <h1
                className={cn(
                  "text-3xl md:text-6xl font-bold text-gray-900 dark:text-white mb-3 px-4",
                  titleClassName
                )}
              >
                {title}
              </h1>
            )}

            {description && (
              <p
                className={cn(
                  "text-base sm:text-base md:text-base lg:text-lg text-gray-600 dark:text-gray-300/80 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed sm:leading-relaxed transition-colors duration-300 px-4 sm:px-0",
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
          <div className="mt-4 sm:mt-10">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
