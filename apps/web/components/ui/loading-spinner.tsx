import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "white" | "gray";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8"
} as const satisfies Record<NonNullable<LoadingSpinnerProps["size"]>, string>;

const colorClasses = {
  primary: "border-theme-primary border-t-transparent",
  white: "border-white border-t-transparent",
  gray: "border-gray-400 border-t-transparent dark:border-gray-500"
} as const satisfies Record<NonNullable<LoadingSpinnerProps["color"]>, string>;

export function LoadingSpinner({ size = "md", className, color = "primary", ...rest }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "inline-block border-2 rounded-full animate-spin",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      aria-hidden="true"
      {...rest}
    />
  );
}

export interface InlineLoadingProps extends HTMLAttributes<HTMLOutputElement> {
  text?: string;
  size?: "sm" | "md";
}

export function InlineLoading({ text = "Loading...", size = "sm", className, ...rest }: InlineLoadingProps) {
  return (
    <output
      className={cn("flex items-center gap-2", className)}
      aria-live="polite"
      aria-busy="true"
      {...rest}
    >
      <LoadingSpinner size={size} color="gray" />
      <span className="text-sm text-gray-500 dark:text-gray-400">{text}</span>
    </output>
  );
}

export interface ButtonLoadingProps extends HTMLAttributes<HTMLOutputElement> {
  isLoading: boolean;
  children: ReactNode;
  loadingText?: string;
  size?: "sm" | "md";
  spinnerColor?: "primary" | "white" | "gray";
}

export function ButtonLoading({
  isLoading,
  children,
  loadingText,
  size = "sm",
  className,
  spinnerColor = "white",
  ...rest
}: ButtonLoadingProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <output
      className={cn("flex items-center gap-2", className)}
      aria-live="polite"
      aria-busy="true"
      {...rest}
    >
      <LoadingSpinner size={size} color={spinnerColor} />
      {loadingText ? <span>{loadingText}</span> : <span className="sr-only">Loading...</span>}
    </output>
  );
}