"use client";

import { ReactNode, Children, useMemo } from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { useContainerWidth } from "@/components/ui/container";
import { useSponsorAdsContext, SponsorCard } from "@/components/sponsor-ads";

interface LayoutMasonryProps {
  children: ReactNode;
}

// Position to insert sponsor card (after first row on desktop = ~3 items)
const SPONSOR_INSERT_POSITION = 3;

// Fixed width configuration
const MASONRY_CONFIG_FIXED = {
  columnsCountBreakPoints: {
    320: 1,
    480: 1,
    640: 2,
    768: 2,
    1024: 3,
  },
  gutterBreakPoints: {
    320: "12px",
    640: "12px",
    768: "16px",
    1024: "16px",
  },
};

// Fluid width configuration (more columns for wider screens)
const MASONRY_CONFIG_FLUID = {
  columnsCountBreakPoints: {
    320: 1,
    480: 1,
    640: 2,
    768: 2,
    1024: 3,
    1280: 4,
    1536: 5,
    1920: 6,
  },
  gutterBreakPoints: {
    320: "12px",
    640: "12px",
    768: "16px",
    1024: "16px",
    1280: "16px",
    1536: "16px",
    1920: "16px",
  },
};

export default function LayoutMasonry({ children }: LayoutMasonryProps) {
  const containerWidth = useContainerWidth();
  const config = containerWidth === "fluid" ? MASONRY_CONFIG_FLUID : MASONRY_CONFIG_FIXED;
  const { sponsors } = useSponsorAdsContext();

  // Convert children to array and inject sponsor card after first row
  const childrenWithSponsor = useMemo(() => {
    const childArray = Children.toArray(children);

    // If no sponsors or not enough children, return original
    if (sponsors.length === 0 || childArray.length < SPONSOR_INSERT_POSITION) {
      return childArray;
    }

    // Insert sponsor card after first row
    const result = [...childArray];
    result.splice(
      SPONSOR_INSERT_POSITION,
      0,
      <div key="sponsor-card">
        <SponsorCard sponsors={sponsors} rotationInterval={5000} />
      </div>
    );

    return result;
  }, [children, sponsors]);

  return (
    <ResponsiveMasonry
      columnsCountBreakPoints={config.columnsCountBreakPoints}
      gutterBreakPoints={config.gutterBreakPoints}
    >
      <Masonry>{childrenWithSponsor}</Masonry>
    </ResponsiveMasonry>
  );
}
