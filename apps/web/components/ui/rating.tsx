"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const MAX_RATING = 5;

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

function StarIcon({ filled, sizeClass }: { filled: boolean; sizeClass: string }) {
  return (
    <svg
      className={cn(
        sizeClass,
        filled
          ? "text-yellow-400"
          : "text-gray-300 dark:text-gray-600",
        "transition-colors duration-200"
      )}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={filled ? "0" : "2"}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

export function Rating({
  value,
  onChange,
  readOnly = false,
  size = "md",
  className,
}: RatingProps) {
  const t = useTranslations();
  const stars = Array.from({ length: MAX_RATING }, (_, i) => i + 1);
  const sizeClass = sizeClasses[size];

  if (readOnly) {
    // One image named by its value (for example: Rated 4.3 out of 5); the stars themselves are decoration.
    const rounded = Math.round(value * 10) / 10;
    return (
      <div
        className={cn("flex items-center gap-1", className)}
        role="img"
        aria-label={t("common.RATED_OUT_OF", { value: rounded, max: MAX_RATING })}
      >
        {stars.map((star) => (
          <span key={star} aria-hidden="true" className="p-1">
            <StarIcon filled={star <= rounded} sizeClass={sizeClass} />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)} role="radiogroup" aria-label={t("itemDetail.RATING")}>
      <span className="text-sm text-muted-foreground mr-2">
        {value}/{MAX_RATING}
      </span>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={cn(
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-yellow-400 transition-all duration-200 rounded-xs p-1",
            "hover:text-yellow-400 hover:scale-110 cursor-pointer active:scale-95"
          )}
          aria-label={t("common.RATE_STARS", { count: star })}
          aria-checked={star === value}
          role="radio"
        >
          <StarIcon filled={star <= value} sizeClass={sizeClass} />
        </button>
      ))}
    </div>
  );
}
