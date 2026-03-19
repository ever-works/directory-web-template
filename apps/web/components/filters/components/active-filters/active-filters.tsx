import { Button } from "@heroui/react";
import { X } from "lucide-react";
import { useMemo } from "react";
import { ActiveFiltersProps, TagId } from "../../types";
import { containerStyles, textStyles, filterItemStyles } from "../../utils/style-utils";
import { formatDisplayName } from "../../utils/text-utils";

/**
 * Active filters component
 * Displays and manages active search, tags, and sort filters
 */
export function ActiveFilters({
  searchTerm,
  setSearchTerm,
  selectedTags,
  setSelectedTags,
  selectedCategories,
  setSelectedCategories,
  sortBy,
  setSortBy,
  availableTags,
  availableCategories,
  clearAllFilters,
}: ActiveFiltersProps) {
  const hasActiveFilters = searchTerm || selectedTags.length > 0 || selectedCategories.length > 0 || sortBy !== "popularity";

  // Memoize category and tag lookups to prevent unnecessary iterations
  const selectedCategoryData = useMemo(() => {
    return selectedCategories
      .map((categoryId) => {
        const category = availableCategories.find((c) => c.id === categoryId);
        return category ? { id: categoryId, name: category.name } : null;
      })
      .filter((item): item is { id: string; name: string } => item !== null);
  }, [selectedCategories, availableCategories]);

  const selectedTagData = useMemo(() => {
    return selectedTags
      .map((tagId) => {
        const tag = availableTags.find((t) => t.id === tagId);
        return tag ? { id: tagId, name: tag.name } : null;
      })
      .filter((item): item is { id: TagId; name: string } => item !== null);
  }, [selectedTags, availableTags]);

  if (!hasActiveFilters) {
    return null;
  }

  const removeSelectedTag = (tagId: TagId) => {
    setSelectedTags(selectedTags.filter((id) => id !== tagId));
  };

  const removeSelectedCategory = (categoryId: string) => {
    setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
  };

  return (
    <div className={containerStyles.base}>
      <div className={containerStyles.header}>
        <div className="flex items-center justify-between">
          <h2 className={textStyles.title}>
            Active Filters
          </h2>
          <Button
            size="sm"
            variant="ghost"
            color="danger"
            onPress={clearAllFilters}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Clear All
          </Button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {searchTerm && (
          <div className="flex items-center gap-2">
            <span className={textStyles.label}>
              Search:
            </span>
            <span className={`${filterItemStyles.base} ${filterItemStyles.primary}`}>
              {searchTerm}
              <button
                onClick={() => setSearchTerm("")}
                className={filterItemStyles.removeButton.primary}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {selectedTagData.length > 0 && (
          <div className="space-y-2">
            <span className={textStyles.label}>
              Selected Tags:
            </span>
            <div className="flex flex-wrap gap-2">
              {selectedTagData.map((tag) => (
                <span
                  key={tag.id}
                  className={`${filterItemStyles.base} ${filterItemStyles.primary}`}
                >
                  {formatDisplayName(tag.name)}
                  <button
                    onClick={() => removeSelectedTag(tag.id)}
                    className={filterItemStyles.removeButton.primary}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {selectedCategoryData.length > 0 && (
          <div className="space-y-2">
            <span className={textStyles.label}>
              Selected Categories:
            </span>
            <div className="flex flex-wrap gap-2">
              {selectedCategoryData.map((category) => (
                <span
                  key={category.id}
                  className={`${filterItemStyles.base} ${filterItemStyles.primary}`}
                >
                  {formatDisplayName(category.name)}
                  <button
                    onClick={() => removeSelectedCategory(category.id)}
                    className={filterItemStyles.removeButton.blue}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {sortBy !== "popularity" && (
          <div className="flex items-center gap-2">
            <span className={textStyles.label}>
              Sort:
            </span>
            <span className={`${filterItemStyles.base} ${filterItemStyles.green}`}>
              {sortBy === "name-asc"
                ? "Name (A-Z)"
                : sortBy === "name-desc"
                  ? "Name (Z-A)"
                  : sortBy === "date-desc"
                    ? "Newest"
                    : sortBy === "date-asc"
                      ? "Oldest"
                      : "Popularity"}
              <button
                onClick={() => setSortBy("popularity")}
                className={filterItemStyles.removeButton.green}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 