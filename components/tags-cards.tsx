"use client";

import { Tag } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Spinner } from "@heroui/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Hash, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useContainerWidth } from "@/components/ui/container";

interface TagsCardsProps {
  tags: Tag[];
  basePath?: string;
  className?: string;
  /** Compact mode: smaller cards, no truncation - ideal for tags listing page */
  compact?: boolean;
}

export function TagsCards({ tags, className, compact = false }: TagsCardsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loadingTag, setLoadingTag] = useState<string | null>(null);
  const containerWidth = useContainerWidth();
  const isFluid = containerWidth === "fluid";

  // Parse current tags from query params to determine active state
  const currentTagsParam = searchParams.get('tags');
  const currentTags = currentTagsParam?.split(',') || [];

  useEffect(() => {
    setLoadingTag(null);
  }, [pathname, searchParams]);

  // Don't render if tags array is empty or undefined (after all hooks)
  if (!tags || tags.length === 0) {
    return null;
  }

  const renderTagCard = (tag: Tag) => {
    // Check if this tag is in the current selection
    const isActive = currentTags.includes(tag.id);

    const handleClick = () => {
      setLoadingTag(tag.id);
      router.push(`/?tags=${tag.id}`);
    };

    return (
      <div
        key={tag.id}
        className={cn(
          "group cursor-pointer overflow-hidden relative rounded-2xl",
          className
        )}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        aria-label={`View items tagged ${tag.name}`}
        tabIndex={0}
      >
        {/* Loading overlay */}
        {loadingTag === tag.id && (
          <div className="absolute inset-0 border-1 border-theme-primary-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl flex items-center justify-center z-50 transition-opacity duration-300">
            <Spinner size="lg" color="primary" />
          </div>
        )}
        <div
          className={cn( "group overflow-hidden hover:overflow-hidden relative rounded-2xl p-2 shadow-none border-1 border-theme-primary-200 dark:border-gray-800 bg-white dark:bg-gray-800/30 backdrop-blur-md transition-all duration-700 h-full",
          "hover:shadow-md hover:border-theme-primary/70 dark:hover:border-theme-primary/70",
          isActive && "border-theme-primary/70 shadow-md"
          )}
        >
          {/* Bottom-right gradient accent */}
          <div className="absolute opacity-55 -bottom-6 -right-6 w-24 h-24 rounded-full bg-linear-to-tl from-purple-500/10 via-theme-primary-500/15 to-transparent blur-xl pointer-events-none z-0" />
          <div className={cn("overflow-hidden rounded-2xl",
            compact ? "p-3 sm:p-4 relative z-10" : "p-4 sm:p-6 relative z-10"
          )}>
            <div className="flex items-start justify-between">
              <div className={cn(
                "flex items-center",
                compact ? "gap-2" : "gap-3"
              )}>
                <div className={cn(
                  "rounded-lg transition-colors duration-300",
                  "bg-theme-primary-900/5 dark:bg-theme-primary-900/20 border border-theme-primary/30",
                  "group-hover:bg-theme-primary-800/10 dark:group-hover:bg-theme-primary-800/20",
                  compact ? "p-1.5" : "p-2"
                )}>
                  <Hash className={cn(
                    "transition-colors duration-300",
                    "text-theme-primary-500 dark:text-theme-primary-500",
                    "group-hover:text-theme-primary-500 dark:group-hover:text-theme-primary-500",
                    compact ? "w-4 h-4" : "w-5 h-5"
                  )} />
                </div>
                <div className={cn(
                  "flex-1",
                  !compact && "min-w-0"
                )}>
                  <h3 className={cn(
                    "font-semibold transition-colors duration-300",
                    "text-gray-800 dark:text-gray-50",
                    "group-hover:text-theme-primary-500 dark:group-hover:text-theme-primary-500 capitalize",
                    compact ? "text-sm sm:text-base" : "text-lg sm:text-xl font-bold line-clamp-1"
                  )}>
                    {tag.name}
                  </h3>
                </div>
              </div>
              <ArrowRight className={cn(
                "transition-all duration-300 opacity-0 group-hover:opacity-100",
                "text-theme-primary-500 dark:text-theme-primary-300",
                "group-hover:translate-x-1 group-hover:animate-bounce-x",
                compact ? "w-3.5 h-3.5" : "w-4 h-4"
              )} />
            </div>
          </div>
          <div className={cn(
            "pt-0 rounded-2xl",
            compact ? "px-3 sm:px-4 pb-3 sm:pb-4" : "px-4 sm:px-6 pb-4 sm:pb-6"
          )}>
            <div className="flex items-center justify-between w-full">
              <span className={cn("inline-flex items-center px-3 py-1 rounded-full",
										"bg-theme-primary/10 dark:bg-theme-primary/20",
										"border border-theme-primary/20 dark:border-theme-primary/30",
										"text-xs font-medium text-theme-primary dark:text-theme-primary-400",
										"backdrop-blur-sm",
										"group-hover:bg-theme-primary/15 dark:group-hover:bg-theme-primary/25",
										"group-hover:border-theme-primary/30 dark:group-hover:border-theme-primary/40",
										"transition-all duration-300",
                compact ? "text-xs" : "text-sm"
              )}>
                {tag.count || 0} items
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className={`grid gap-4 sm:gap-6 ${
        isFluid
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      }`}>
        {tags.map(renderTagCard)}
      </div>
      
      {tags.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <Hash className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No tags found</h3>
            <p className="text-sm">There are no tags available at the moment.</p>
          </div>
        </div>
      )}
    </div>
  );
} 