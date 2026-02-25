import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Category, ItemData } from "./content";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if the application is running in demo mode.
 * Demo mode enables additional settings and seeds comprehensive test data.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO === "true";
}

export function getItemPath(slug: string) {
  return `/items/${slug}`;
}

export function getCategoryName(category: string | Category) {
  if (typeof category === "string") {
    return category;
  }

  return category.name;
}

export function getCategoriesName(
  categories: Category | Category[] | string | string[]
) {
  if (Array.isArray(categories)) {
    return categories.map(getCategoryName).join(", ");
  }

  return getCategoryName(categories);
}

export function maskEmail(email: string) {
  if (!email) return "";

  const parts = email.split("@");
  if (parts.length !== 2) return email; // Not a valid email format

  const [username, domain] = parts;

  const maskedUsername =
    username.length <= 2
      ? username
      : `${username.slice(0, 2)}${"*".repeat(
          Math.min(username.length - 2, 3)
        )}`;

  return `${maskedUsername}@${domain}`;
}

/**
 * Sorts an array of objects by a specified property (universal for all data types)
 *
 * @template T - Generic type for array elements
 * @template K - Generic type for object keys (must be a key of T)
 *
 * @param items - The array of objects to sort
 * @param property - The property to sort by (default: 'count')
 * @param order - Sort order: 'desc' (descending) or 'asc' (ascending) (default: 'desc')
 * @param valueType - The type of value to sort: 'number', 'string', 'date', 'boolean' or 'auto' (default: 'auto')
 * @param customCompare - Optional custom comparison function for complex cases
 * @returns The sorted array
 */
export function sortByProperty<T, K extends keyof T>(
  items: T[],
  property: K = "count" as unknown as K,
  order: "desc" | "asc" = "desc",
  valueType: "number" | "string" | "date" | "boolean" | "auto" = "auto",
  customCompare?: (a: any, b: any) => number
): T[] {
  if (!items || !items.length) return items;

  // Create a copy of the array to avoid modifying the original
  return [...items].sort((a, b) => {
    // Use the custom comparison function if provided
    if (customCompare) {
      return order === "desc"
        ? customCompare(b[property], a[property])
        : customCompare(a[property], b[property]);
    }

    const valueA = a[property] ?? (valueType === "number" ? 0 : "");
    const valueB = b[property] ?? (valueType === "number" ? 0 : "");

    const detectedType =
      valueType === "auto"
        ? typeof valueA === "number"
          ? "number"
          : valueA instanceof Date
          ? "date"
          : typeof valueA === "boolean"
          ? "boolean"
          : "string"
        : valueType;

    let comparison = 0;

    switch (detectedType) {
      case "number":
        comparison = (valueA as number) - (valueB as number);
        break;
      case "string":
        comparison = String(valueA).localeCompare(String(valueB));
        break;
      case "date":
        const dateA =
          valueA instanceof Date
            ? valueA
            : typeof valueA === "string" || typeof valueA === "number"
            ? new Date(valueA)
            : new Date(0);
        const dateB =
          valueB instanceof Date
            ? valueB
            : typeof valueB === "string" || typeof valueB === "number"
            ? new Date(valueB)
            : new Date(0);
        // Check for invalid dates
        if (isNaN(dateA.getTime())) dateA.setTime(0);
        if (isNaN(dateB.getTime())) dateB.setTime(0);
        comparison = dateA.getTime() - dateB.getTime();
        break;
      case "boolean":
        comparison = (valueA ? 1 : 0) - (valueB ? 1 : 0);
        break;
      default:
        // Fallback for unknown types - convert to string
        comparison = String(valueA).localeCompare(String(valueB));
    }

    // Invert comparison if order is descending
    return order === "desc" ? -comparison : comparison;
  });
}

/**
 * Alias of sortByProperty for backward compatibility
 */
export function sortByNumericProperty<
  T extends { [key: string]: any },
  K extends keyof T
>(items: T[], property: K = "count" as K, order: "desc" | "asc" = "desc"): T[] {
  return sortByProperty<T, K>(items, property, order, "number");
}

/**
 * Filter items by categories, search term, and tags
 * Shared utility function to eliminate code duplication
 */
export function filterItems(
  items: ItemData[],
  options: {
    selectedCategories?: string[];
    searchTerm?: string;
    selectedTags?: string[];
  }
): ItemData[] {
  let filtered = items;
  const { selectedCategories = [], searchTerm = "", selectedTags = [] } = options;

  // Filter by selected categories
  if (selectedCategories.length > 0) {
    filtered = filtered.filter(item => {
      if (!item.category) return false;
      const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
      return itemCategories.some((cat: string | Category) => {
        const catId = typeof cat === "string" ? cat : cat?.id;
        if (!catId) return false;
        // Case-insensitive comparison to match URL encoding behavior
        return selectedCategories.some(selected => selected.toLowerCase() === catId.toLowerCase());
      });
    });
  }

  // Filter by search term
  if (searchTerm && searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  }

  // Filter by selected tags
  if (selectedTags.length > 0) {
    filtered = filtered.filter(item => {
      if (!item.tags) return false;
      const itemTags = Array.isArray(item.tags) ? item.tags : [item.tags];
      return itemTags.some((tag: string | { id: string }) => {
        const tagId = typeof tag === "string" ? tag : tag.id;
        if (!tagId) return false;
        // Case-insensitive comparison to match URL encoding behavior
        return selectedTags.some(selected => selected.toLowerCase() === tagId.toLowerCase());
      });
    });
  }

  return filtered;
}

/**
 * Returns true if the pathname is a category page (strict match)
 * If href is provided, checks for exact match or subpath
 */
export function isCategoryPagePath(pathname: string, href?: string): boolean {
  if (href) {
    return pathname === href || pathname.startsWith(href + "/");
  }
  return pathname === '/categories';
}

// Returns the embeddable URL for YouTube or Vimeo, or the original if not recognized
export function getVideoEmbedUrl(url: string): string {
  if (!url) return "";
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.host.replace(/^www\./, "");

    if (host === "youtube.com") {
      // e.g. https://www.youtube.com/watch?v=VIDEO_ID
      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    if (host === "youtu.be") {
      // e.g. https://youtu.be/VIDEO_ID
      const videoId = parsedUrl.pathname.slice(1);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    if (host === "vimeo.com") {
      // e.g. https://vimeo.com/VIDEO_ID
      const videoId = parsedUrl.pathname.slice(1);
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }
  } catch {
    return url;
  }
  return url;
}

/**
 * Converts a string to Title Case
 * Handles both space-separated and hyphenated strings
 * Example: "hello world" -> "Hello World"
 * Example: "time-tracking-tools" -> "Time-Tracking-Tools"
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  const hasHyphens = str.includes('-');
  const delimiter = hasHyphens ? '-' : ' ';
  return str
    .toLowerCase()
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(delimiter);
}
