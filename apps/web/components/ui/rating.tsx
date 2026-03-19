"use client";

import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export function Rating({
  value,
  onChange,
  readOnly = false,
  size = "md",
  className,
}: RatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  const sizeClass = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-1", className)} role="radiogroup" aria-label="Rating">
      {!readOnly && (
        <span className="text-sm text-muted-foreground mr-2">
          {value}/5
        </span>
      )}
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => {
            if (!readOnly && onChange) {
              console.log('Rating clicked:', star);
              onChange(star);
            }
          }}
          className={cn(
            "focus:outline-hidden focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-all duration-200 rounded-xs p-1",
            !readOnly && "hover:text-yellow-400 hover:scale-110 cursor-pointer active:scale-95",
            readOnly && "cursor-default"
          )}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          aria-checked={star === value}
          role="radio"
        >
          <svg
            className={cn(
              sizeClass,
              star <= value
                ? "text-yellow-400"
                : "text-gray-300 dark:text-gray-600",
              "transition-colors duration-200"
            )}
            fill={star <= value ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={star <= value ? "0" : "2"}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
} 