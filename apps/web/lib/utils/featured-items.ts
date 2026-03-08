import { ItemData } from '@/lib/content';

export interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;
  featuredUntil?: string;
  isActive: boolean;
  featuredAt: string;
}

/**
 * Sort items to prioritize featured items at the top
 */
export function sortItemsWithFeatured(
  items: ItemData[],
  featuredItems: FeaturedItem[]
): ItemData[] {
  // Create a map of featured items for quick lookup
  const featuredMap = new Map<string, FeaturedItem>();
  featuredItems
    .filter(item => item.isActive)
    .forEach(item => {
      featuredMap.set(item.itemSlug, item);
    });

  // Separate featured and non-featured items
  const featured: ItemData[] = [];
  const nonFeatured: ItemData[] = [];

  items.forEach(item => {
    const featuredItem = featuredMap.get(item.slug);
    if (featuredItem) {
      // Mark the item as featured
      const featuredItemData = { ...item, featured: true };
      featured.push(featuredItemData);
    } else {
      nonFeatured.push(item);
    }
  });

  // Sort featured items by their featured order
  featured.sort((a, b) => {
    const aOrder = featuredMap.get(a.slug)?.featuredOrder || 0;
    const bOrder = featuredMap.get(b.slug)?.featuredOrder || 0;
    return aOrder - bOrder;
  });

  // Return featured items first, then non-featured items
  return [...featured, ...nonFeatured];
}

/**
 * Check if an item is featured
 */
export function isItemFeatured(
  itemSlug: string,
  featuredItems: FeaturedItem[]
): boolean {
  return featuredItems.some(
    item => item.itemSlug === itemSlug && item.isActive
  );
}

/**
 * Get featured item data for a specific item
 */
export function getFeaturedItemData(
  itemSlug: string,
  featuredItems: FeaturedItem[]
): FeaturedItem | undefined {
  return featuredItems.find(
    item => item.itemSlug === itemSlug && item.isActive
  );
}

/**
 * Check if a featured item is expiring soon (within 7 days)
 */
export function isFeaturedItemExpiring(featuredItem: FeaturedItem): boolean {
  if (!featuredItem.featuredUntil) return false;
  
  const expirationDate = new Date(featuredItem.featuredUntil);
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return expirationDate <= sevenDaysFromNow;
}

/**
 * Filter out expired featured items
 */
export function filterActiveFeaturedItems(
  featuredItems: FeaturedItem[]
): FeaturedItem[] {
  const now = new Date();
  
  return featuredItems.filter(item => {
    if (!item.isActive) return false;
    if (!item.featuredUntil) return true;
    
    const expirationDate = new Date(item.featuredUntil);
    return expirationDate > now;
  });
}

/**
 * Get the next available featured order
 */
export function getNextFeaturedOrder(featuredItems: FeaturedItem[]): number {
  if (featuredItems.length === 0) return 0;
  
  const maxOrder = Math.max(...featuredItems.map(item => item.featuredOrder));
  return maxOrder + 1;
}
