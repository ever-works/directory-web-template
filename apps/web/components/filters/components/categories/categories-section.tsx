import { useCallback } from 'react';
import { Accordion, AccordionItem } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { CategoriesProps } from '../../types';
import { Tag } from '@/lib/content';
import { CategoriesList } from './categories-list';
import { SearchInput } from '../../../ui/search-input';
import { useFilters } from '../../context/filter-context';
import { containerStyles, textStyles } from '../../utils/style-utils';
import { SortControl } from '../controls/sort-control';
import { ActiveFilters } from '../active-filters/active-filters';
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import { useContainerWidth } from '@/components/ui/container';

/**
 * Main categories section component
 * Handles both mobile and desktop layouts for categories
 */
export function Categories({ total, categories, tags }: CategoriesProps & { tags: Tag[] }) {
  const t = useTranslations('listing');
  const { categoriesEnabled } = useCategoriesEnabled();
  const containerWidth = useContainerWidth();
  const isFluid = containerWidth === 'fluid';
  const {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    selectedTags,
    setSelectedTags,
    selectedCategories,
    setSelectedCategories,
    clearAllFilters
  } = useFilters();

  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
      if (categoryId === 'all' || categoryId === 'clear-all') {
        setSelectedCategories([]);
      } else {
        setSelectedCategories(
          (prev) =>
            prev.includes(categoryId)
              ? prev.filter((id) => id !== categoryId) // deselect
              : [...prev, categoryId] // add to selection
        );
      }
    },
    [setSelectedCategories]
  );

  // Don't render if no categories
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile Layout */}
      {categoriesEnabled && (
        <div className="md:hidden">
          <Accordion
            variant="bordered"
            className="shadow-xs bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-xl transition-colors duration-300"
          >
            <AccordionItem
              key="1"
              aria-label="Category"
              title={
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 dark:text-gray-200 transition-colors duration-300">
                    {t('CATEGORIES')}
                  </span>
                  <span className="bg-theme-primary-100 dark:bg-white/5 text-theme-primary-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-bold border border-theme-primary-200 dark:border-white/6">
                    {total}
                  </span>
                </div>
              }
            >
              <div className="px-2 pb-2">
                <CategoriesList
                  categories={categories}
                  mode="filter"
                  selectedCategories={selectedCategories}
                  onCategoryToggle={handleCategoryToggle}
                />
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* Desktop Layout */}
      <div className={`hidden md:flex flex-col w-full gap-1 ${isFluid ? 'max-w-64' : 'max-w-64'}`}>
        {/* Search Bar */}
        <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        {/* Categories Section */}
        {categoriesEnabled && (
          <div className={containerStyles.base}>
            <div className={containerStyles.header}>
              <h2 className={textStyles.title}>{t('CATEGORIES')}</h2>
            </div>
            <div className={containerStyles.content}>
              <CategoriesList
                categories={categories}
                mode="filter"
                selectedCategories={selectedCategories}
                onCategoryToggle={handleCategoryToggle}
              />
            </div>
          </div>
        )}

        {/* Active Filters Section */}
        <ActiveFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          sortBy={sortBy}
          setSortBy={setSortBy}
          availableTags={tags}
          availableCategories={categories}
          clearAllFilters={clearAllFilters}
        />

        {/* Sort By Section (styled card, now outside categories) */}
        <div className="bg-white dark:bg-white/3 backdrop-blur-xs rounded-xs border border-gray-200 dark:border-white/6 overflow-hidden shadow-xs dark:shadow-lg transition-colors duration-300">
          <div className="p-1.5 lg:p-2 border-b border-gray-200 dark:border-white/6">
            <h2 className="text-base lg:text-sm font-semibold text-gray-900 dark:text-gray-200 transition-colors duration-300 capitalize">
              {t('SORT_BY')}
            </h2>
          </div>
          <div className="p-1.5 lg:p-2">
            <SortControl sortBy={sortBy} setSortBy={setSortBy} />
          </div>
        </div>
      </div>
    </>
  );
}
