import { Button, cn } from "@heroui/react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { TagsProps } from "../../types";
import { TagsList } from "./tags-list";
import { useStickyHeader } from "../../hooks/use-sticky-header";
import { useTagVisibility } from "../../hooks/use-tag-visibility";
import { useFilters } from "../../context/filter-context";
import { useTagsEnabled } from "@/hooks/use-tags-enabled";

/**
 * Hard cap on tags rendered into the horizontal-scroll strip's DOM.
 * The "+N more" popover handles the rest (portal, client-only — not in SSR).
 *
 * Why a hard cap (Spec 020 follow-up): each tag is rendered as a HeroUI
 * `Button` whose className totals ~1 KB of Tailwind utility classes. With
 * the previous "pass full tags array" behaviour, a catalogue with 855
 * tags (e.g. demo.ever.works) shipped ~855 × ~1 KB × 2 layouts
 * (mobile-only + desktop-only Tags instances) ≈ 1.7 MB of pure tag-button
 * DOM on every render. Capping at 30 cuts that to ~60 KB while keeping
 * the horizontal-scroll-through-many-tags UX intact for the common case.
 *
 * Tunable per-fork via `NEXT_PUBLIC_TAG_STRIP_CAP` if a deployment really
 * needs more.
 */
const TAG_STRIP_HARD_CAP = (() => {
  const raw = Number.parseInt(process.env.NEXT_PUBLIC_TAG_STRIP_CAP ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
})();

/**
 * Main tags section component
 * Handles sticky behavior and tag visibility
 */
export function Tags({
  tags,
  basePath,
  resetPath,
  enableSticky = false,
  maxVisibleTags,
  mode = "navigation", // "navigation" | "filter"
  allItems,
}: TagsProps & { mode?: "navigation" | "filter" }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { isSticky } = useStickyHeader({ enableSticky });
  const { selectedTags, setSelectedTags } = useFilters();
  const { tagsEnabled } = useTagsEnabled();
  const {
    showAllTags,
    visibleTags,
    hasMoreTags,
    toggleTagVisibility,
  } = useTagVisibility(tags, maxVisibleTags);

  // Hide if tags are disabled or if tags array is empty
  if (!tagsEnabled || !tags || tags.length === 0) {
    return null;
  }

  const isAnyTagActive = mode === "filter" 
    ? selectedTags.length > 0
    : tags.some((tag) => {
        const tagBasePath = basePath
          ? `${basePath}/${encodeURIComponent(tag.id)}`
          : `/tags/${encodeURIComponent(tag.id)}`;
        return pathname === tagBasePath || pathname.startsWith(tagBasePath + '/');
      });

  return (
    <div
      className={cn(
        "transition-[background-color,box-shadow] duration-200 py-2",
        enableSticky
          ? cn(
              "sticky top-4 z-10",
              isSticky
                ? "bg-white/95 dark:bg-[#0a0a0a]/95 shadow-md dark:border-b dark:border-white/6"
                : "bg-transparent"
            )
          : "bg-inherit"
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3
            className={cn(
              "text-lg font-bold transition-colors duration-300",
              isSticky
                ? "text-gray-900 dark:text-white"
                : "text-gray-900 dark:text-white"
            )}
          >
            {t("TAG")}
          </h3>
          {hasMoreTags && (
            <Button
              variant="flat"
              radius="full"
              size="sm"
              className={cn(
                "px-4 py-1 font-medium transition-[color,box-shadow] duration-200 bg-gray-100 dark:bg-white/6 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/1",
                isSticky && "shadow-xs"
              )}
              onPress={toggleTagVisibility}
            >
              {showAllTags ? (
                <>
                  <span className="hidden sm:inline">{t("SHOW_AS_SINGLE_ROW")}</span>
                  <span className="sm:hidden">{t("SINGLE_ROW")}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="ml-1.5 transition-transform group-hover:-translate-y-0.5 dark:text-default-300"
                  >
                    <path
                      d="M3 10h18M3 14h18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline text-[1opx]">
                    {t("SHOW_ALL_TAGS", { count: tags.length })}
                  </span>
                  <span className="sm:hidden">{t("ALL_TAGS")}</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="ml-1.5 transition-transform group-hover:translate-y-0.5 dark:text-default-300"
                  >
                    <path
                      d="M4 4h16v7H4V4zm0 9h16v7H4v-7z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </Button>
          )}
        </div>
        
        <TagsList
          tags={tags}
          basePath={basePath}
          resetPath={resetPath}
          showAllTags={showAllTags}
          // Single-row mode: cap the horizontal scroll strip at TAG_STRIP_HARD_CAP
          // so the DOM doesn't include every tag in the catalogue. The previous
          // version passed the full `tags` array here, which on a directory
          // with 855 tags rendered ~855 HeroUI buttons × 2 layouts (mobile +
          // desktop) × ~1KB of Tailwind classes each — about 1.7 MB of pure
          // tag-button DOM in the SSR payload. The "+N more" popover (line
          // 671 below) handles overflow without rendering all rows in SSR
          // (it uses tanstack-react-virtual + a portal that's client-only).
          // Spec 020 follow-up — `docs/performance/server-side-listings.md`.
          visibleTags={showAllTags ? visibleTags : tags.slice(0, TAG_STRIP_HARD_CAP)}
          isAnyTagActive={isAnyTagActive}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          allItemsCount={allItems ? allItems.length : undefined}
        />
      </div>
    </div>
  );
} 
