import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StickyHeaderProps {
  children: ReactNode;
  className?: string;
  top?: number;
  zIndex?: number;
  withBlur?: boolean;
  withShadow?: boolean;
  withBorder?: boolean;
}

export function StickyHeader({
  children,
  className,
  top = 4,
  zIndex = 10,
  withShadow = true,
  withBorder = false,
}: StickyHeaderProps) {
  return (
    <div
      className={cn(
        "sticky transition-all duration-300",
        withShadow && "shadow-md",
        withBorder && "border-b border-gray-200 dark:border-white/6",
        "bg-white/95 dark:bg-white/5",
        className
      )}
      style={{ top, zIndex }}
    >
      {children}
    </div>
  );
}
