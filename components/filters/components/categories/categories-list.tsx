import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { CategoriesListProps } from "../../types";
import { CategoryItem } from "./category-item";
import { useFilters } from "../../context/filter-context";
import { isCategoryPagePath } from "@/lib/utils";

/**
 * Categories list component
 * Renders a list of category items with "All Categories" option
 */
export function CategoriesList({ 
  categories, 
  mode = "navigation",
  selectedCategories: propSelectedCategories,
  onCategoryToggle: propOnCategoryToggle
}: CategoriesListProps) {
  const t = useTranslations("listing");
  const pathname = usePathname();
  const { selectedCategories: contextSelectedCategories, toggleSelectedCategory, clearSelectedCategories } = useFilters();

  // Use props if provided, otherwise fall back to context
  const selectedCategories = propSelectedCategories ?? contextSelectedCategories;
  
  const totalItems = categories.reduce((sum, cat) => sum + (cat.count || 0), 0);

  // Handle category toggle for filter mode
  const handleCategoryToggle = (categoryId: string) => {
    if (propOnCategoryToggle) {
      // Use prop callback if provided
      propOnCategoryToggle(categoryId);
    } else {
      // Fall back to context methods
      if (categoryId === "all") {
        clearSelectedCategories();
      } else {
        toggleSelectedCategory(categoryId);
      }
    }
  };

  if (mode === "filter") {
    return (
      <div className="space-y-1.5 max-h-lvh">
        {/* All Categories Item */}
        <CategoryItem
          category={{ id: "all", name: t("ALL_CATEGORIES"), count: totalItems }}
          isActive={selectedCategories.length === 0}
          href="#"
          isAllCategories={true}
          totalItems={totalItems}
          mode="filter"
          onToggle={() => handleCategoryToggle("all")}
        />

        {/* Individual Categories */}
        <div
          className="overflow-y-auto max-h-[650px] scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 -mr-2 [&::-webkit-scrollbar]:w-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {categories.map((category) => {
            if (!category.count) return null;
            
            const isActive = selectedCategories.includes(category.id);

            return (
              <CategoryItem
                key={category.id}
                category={category}
                isActive={isActive}
                href="#"
                mode="filter"
                onToggle={() => handleCategoryToggle(category.id)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Navigation mode (original behavior)
  return (
    <div className="space-y-1.5 max-h-lvh">
      {/* All Categories Item */}
      <CategoryItem
        category={{ id: "all", name: t("ALL_CATEGORIES"), count: totalItems }}
        isActive={isCategoryPagePath(pathname)}
        href="/categories"
        isAllCategories={true}
        totalItems={totalItems}
      />

      {/* Individual Categories */}
      <div
        className="overflow-y-auto max-h-[650px] scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 -mr-2 [&::-webkit-scrollbar]:w-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {categories.map((category) => {
          if (!category.count) return null;

          const href = `/categories/${category.id}`;
          const isActive = isCategoryPagePath(pathname, href);

          return (
            <CategoryItem
              key={category.id}
              category={category}
              isActive={isActive}
              href={href}
            />
          );
        })}
      </div>
    </div>
  );
} 