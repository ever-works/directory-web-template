import { FiTag } from "react-icons/fi";
import { cn } from "@/lib/utils";
import React from "react";

interface ProfileTagProps {
  label: string;
  className?: string;
}

const PROFILE_TAG_BASE_CLASSES = cn(
  "inline-flex items-center gap-1 px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 text-gray-800 dark:text-gray-100 text-sm font-medium transition-all duration-200 shadow-xs hover:shadow-md hover:border-theme-primary-400 focus:outline-hidden focus:ring-2 focus:ring-theme-primary-400"
);

export function ProfileTag({ label, className }: ProfileTagProps) {
  return (
    <span
      className={cn(PROFILE_TAG_BASE_CLASSES, className)}
      tabIndex={0}
    >
      <FiTag className="w-4 h-4 opacity-60" />
      {label}
    </span>
  );
} 