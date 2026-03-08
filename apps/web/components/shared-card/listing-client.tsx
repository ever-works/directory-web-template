"use client";

import {
  Card,
  CardConfigOptions,
  CardPresets, type BaseCardProps
} from "@/components/shared-card";
import { Category, ItemData, Tag } from "@/lib/content";
import { usePathname } from "@/i18n/navigation";
import { isCategoryPagePath } from "@/lib/utils";

interface ListingClientProps extends Omit<BaseCardProps, 'categories'> {
  total: number;
  start: number;
  page: number;
  basePath: string;
  categories?: Category[];
  tags: Tag[];
  items: ItemData[];
  filteredAndSortedItems?: ItemData[];
  config?: CardConfigOptions;
  headerActions?: React.ReactNode;
}

export function ListingClient(props: ListingClientProps) {
  const pathname = usePathname();
  const isCategoryPage = isCategoryPagePath(pathname);
  const categories = props.categories ?? [];
  
  // Use different configuration based on mode
  let config = props.config || CardPresets.fullListing;
  
  if (isCategoryPage) {
    // For category pages (filter mode), ensure pagination is enabled
    config = {
      ...config,
      showPagination: true,
      enableTagFilter: true,
    };
  }

  return (
    <Card
      {...props}
      categories={categories}
      config={config}
      className="listing-client"
    />
  );
}
