import { ItemData, Tag } from "@/lib/content";
import { PER_PAGE } from "@/lib/paginate";

export function getTagId(tag: string | Tag): string {
  return typeof tag === "string" ? tag : tag.id;
}

type UseHome2LogicProps = {
  items: ItemData[];
  start: number;
  selectedCategories: string[];
};

function itemHasCategory(item: ItemData, selectedCategories: string[]): boolean {
  if (!selectedCategories.length) return true;
  if (!item.category) return false;
  const itemCategories = Array.isArray(item.category)
    ? item.category
    : [item.category];
  return itemCategories.some(cat => {
    if (typeof cat === "string") return selectedCategories.includes(cat);
    if (typeof cat === "object" && cat && "id" in cat) return selectedCategories.includes(cat.id);
    return false;
  });
}

export function useHomeTwoLogic({ items, start, selectedCategories }: UseHome2LogicProps) {
  
  const filteredItems = selectedCategories.length
    ? items.filter(item => itemHasCategory(item, selectedCategories))
    : items;
  const paginatedItems = filteredItems.slice(start, start + PER_PAGE);

  return {
    items: filteredItems,
    paginatedItems,
  };
}
