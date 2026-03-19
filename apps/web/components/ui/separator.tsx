"use client";

import { cn } from "@/lib/utils";

interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Separator({
  orientation = "horizontal",
  className
}: SeparatorProps) {
  return (
    <div
      className={cn(
        "bg-border",
        orientation === "horizontal"
          ? "h-px w-full"
          : "h-full w-px",
        className
      )}
    />
  );
}