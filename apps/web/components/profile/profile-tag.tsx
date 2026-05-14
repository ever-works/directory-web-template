import { FiTag } from "react-icons/fi";
import { cn } from "@/lib/utils";
import React from "react";

interface ProfileTagProps {
  label: string;
  className?: string;
}

const PROFILE_TAG_BASE_CLASSES = cn(
  "inline-flex items-center gap-1 px-3 py-1 rounded-full border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/5 text-neutral-700 dark:text-neutral-200 text-xs font-medium transition-all duration-150 hover:border-theme-primary-300 dark:hover:border-theme-primary-500/50 hover:bg-theme-primary-50 dark:hover:bg-theme-primary-500/10 hover:text-theme-primary-700 dark:hover:text-theme-primary-300 focus:outline-none focus:ring-2 focus:ring-theme-primary-400"
);

export function ProfileTag({ label, className }: ProfileTagProps) {
  return (
    <span
      className={cn(PROFILE_TAG_BASE_CLASSES, className)}
      tabIndex={0}
    >
      <FiTag className="w-3 h-3 opacity-50" />
      {label}
    </span>
  );
} 