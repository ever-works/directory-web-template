"use client";

import type { ItemData } from "@/lib/content";
import Item from "@/components/item";
import { ItemSkeletonGrid } from "../item-skeleton";

interface SharedCardGridProps {
  items: ItemData[];
  LayoutComponent: React.ComponentType<{ children: React.ReactNode }>;
  layout?: string;
  onItemClick?: (item: ItemData) => void;
  renderCustomItem?: (item: ItemData, index: number) => React.ReactNode;
  animationDelay?: number;
  className?: string;
}

/**
 * SharedCardGrid - Renders a grid of items with animations
 * Follows Single Responsibility Principle - only responsible for rendering items
 */
export function SharedCardGrid({
  items,
  LayoutComponent,
  layout,
  onItemClick,
  renderCustomItem,
  animationDelay = 30,
  className = "space-y-4",
}: SharedCardGridProps) {
  return (
    <div className={className}>
      {items.length === 0 && (
        <ItemSkeletonGrid
          count={15}
          LayoutComponent={LayoutComponent}
        />
      )}
      <LayoutComponent>
          {items.length !== 0 && items.map((item, index) => (
            <div
              key={item.slug}
              className="group animate-fade-in-up-subtle h-full"
              style={{
                animationDelay: `${Math.min(index * animationDelay, 200)}ms`,
                animationFillMode: "both",
              }}
            >
              {renderCustomItem ? (
                renderCustomItem(item, index)
              ) : (
                <Item {...item} layout={layout} onNavigate={() => onItemClick?.(item)} />
              )}
            </div>
          ))}
      </LayoutComponent>
    </div>
  );
}
