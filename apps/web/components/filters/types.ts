import { Category, Tag } from "@/lib/content";
import { ItemData } from "@/lib/content";
import { ReactNode, Dispatch, SetStateAction } from "react";

/**
 * Filter context types
 */
// Define possible sort options as a union type
export type SortOption = 'popularity' | 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc';

// Define possible category/tag selection states
export type CategoryId = string;
export type TagId = string;

/**
 * Coordinates for Near Me filter
 */
export interface NearMeCoordinates {
  latitude: number;
  longitude: number;
  radius: number; // km
}

/**
 * Location filter state
 */
export interface LocationFilterState {
  nearMe?: NearMeCoordinates;
  city?: string;
  country?: string;
  sortByDistance?: boolean;
}

export interface FilterContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedTags: TagId[];
  setSelectedTags: Dispatch<SetStateAction<TagId[]>>;
  selectedCategories: CategoryId[];
  setSelectedCategories: Dispatch<SetStateAction<CategoryId[]>>;
  sortBy: SortOption;
  setSortBy: Dispatch<SetStateAction<SortOption>>;
  clearAllFilters: () => void;
  removeSelectedTag: (tagId: TagId) => void;
  addSelectedTag: (tagId: TagId) => void;
  toggleSelectedTag: (tagId: TagId) => void;
  removeSelectedCategory: (categoryId: string) => void;
  addSelectedCategory: (categoryId: string) => void;
  toggleSelectedCategory: (categoryId: string) => void;
  clearSelectedCategories: () => void;
  selectedCategory: CategoryId | null;
  setSelectedCategory: Dispatch<SetStateAction<CategoryId | null>>;
  selectedTag: TagId | null;
  setSelectedTag: Dispatch<SetStateAction<TagId | null>>;
  isFiltersLoading: boolean;
  // Location filter state
  locationFilter: LocationFilterState;
  setNearMe: (coords: NearMeCoordinates | null) => void;
  setLocationRadius: (radius: number) => void;
  setLocationCity: (city: string | null) => void;
  setLocationCountry: (country: string | null) => void;
  clearLocationFilter: () => void;
}

/**
 * Block link component props
 */
export interface BlockLinkProps {
  href: string;
  isActive: boolean;
  isAllCategories?: boolean;
  children: ReactNode;
}

/**
 * Categories list component props
 */
export interface CategoriesListProps {
  categories: Category[];
  mode?: "navigation" | "filter";
  selectedCategories?: string[];
  /**
   * `multi` mirrors `CategoryItemProps.onToggle` — true when the user
   * held Ctrl / Cmd / Shift while clicking. Default is single-select.
   */
  onCategoryToggle?: (categoryId: string | "clear-all", multi?: boolean) => void;
}

/**
 * Categories component props
 */
export interface CategoriesProps {
  total: number;
  categories: Category[];
}

/**
 * Pagination component props
 */
export interface PaginateProps {
  basePath: string;
  initialPage: number;
  total: number;
  paginationType?: "standard" | "infinite";
  onLoadMore?: (page: number) => Promise<void>;
}

/**
 * Tags component props
 */
export interface TagsProps {
  tags: Tag[];
  basePath?: string;
  resetPath?: string;
  enableSticky?: boolean;
  maxVisibleTags?: number;
  total?: number;
  mode?: 'navigation' | 'filter';
  /**
   * @deprecated Pass `totalItemsCount` instead. With Spec 020's
   * server-side slice, `allItems` is the current page (~12 items),
   * not the catalogue. Using `allItems.length` here breaks the
   * "All Tags (N)" badge.
   */
  allItems?: ItemData[];
  /**
   * Catalogue-wide item count for the "All Tags (N)" badge. Pass
   * `props.total` from the server-side filtered total. Falls back to
   * `allItems?.length` (legacy) and then `tags.length`.
   */
  totalItemsCount?: number;
}

/**
 * Tag item component props
 */
export interface TagItemProps {
  tag: Tag;
  isActive: boolean;
  href: string;
  showCount?: boolean;
}

/**
 * Category item component props
 */
export interface CategoryItemProps {
  category: Category;
  isActive: boolean;
  href: string;
  isAllCategories?: boolean;
  totalItems?: number;
  mode?: "navigation" | "filter";
  /**
   * `multi` is true when the user held Ctrl / Cmd / Shift while clicking,
   * signalling a multi-select intent. Default (no modifier): single-select —
   * clicking replaces the current selection with just this category.
   */
  onToggle?: (categoryId: CategoryId, multi?: boolean) => void;
}

/**
 * Category item component props with strict typing for filter mode
 */
export interface CategoryItemFilterProps extends Omit<CategoryItemProps, 'mode' | 'onToggle'> {
  mode: "filter";
  onToggle: (categoryId: CategoryId, multi?: boolean) => void;
}

/**
 * Category item component props for navigation mode
 */
export interface CategoryItemNavigationProps extends Omit<CategoryItemProps, 'mode' | 'onToggle'> {
  mode?: "navigation";
  onToggle?: never;
}

/**
 * Filter controls component props
 */
export interface FilterControlsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  selectedTags: TagId[];
  setSelectedTags: (tags: TagId[]) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
}

/**
 * Active filters component props
 */
export interface ActiveFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedTags: TagId[];
  setSelectedTags: (tags: TagId[]) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  availableTags: Tag[];
  availableCategories: Category[];
  clearAllFilters: () => void;
} 