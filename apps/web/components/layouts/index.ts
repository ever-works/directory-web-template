import LayoutClassic from "./LayoutClassic";
import LayoutGrid from "./LayoutGrid";
import LayoutCards from "./LayoutCards";
import { JSX } from "react";
import LayoutMasonry from "./LayoutMasonry";

export type LayoutKey = 'classic' | 'grid' | 'cards' | 'masonry';

export const layoutComponents: Record<LayoutKey, ({ children }: { children: React.ReactNode }) => JSX.Element> = {
  grid: LayoutGrid,
  cards: LayoutCards,
  classic: LayoutClassic,
  masonry: LayoutMasonry,
};

export { LayoutClassic, LayoutGrid, LayoutCards };
