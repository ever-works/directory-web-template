import { Search, Building, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ColorVariant = "primary" | "accent" | "secondary";

export interface AuthFeature {
  icon: LucideIcon;
  colorVariant: ColorVariant;
  titleKey: string;
  descriptionKey: string;
}

/**
 * Shared authentication features displayed on both login page and modal
 * Uses i18n translation keys from common namespace
 */
export const authFeatures: AuthFeature[] = [
  {
    icon: Search,
    colorVariant: "primary",
    titleKey: "ADVANCED_SEARCH",
    descriptionKey: "EXPLORE_THOUSANDS"
  },
  {
    icon: Building,
    colorVariant: "accent",
    titleKey: "LIST_YOUR_BUSINESS",
    descriptionKey: "INCREASE_VISIBILITY"
  },
  {
    icon: Globe,
    colorVariant: "secondary",
    titleKey: "PROFESSIONAL_NETWORK",
    descriptionKey: "CONNECT_WITH_EXPERTS"
  }
];
