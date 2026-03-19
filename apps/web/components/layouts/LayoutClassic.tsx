"use client";

import { ReactNode, Children, useMemo } from "react";
import { useSponsorAdsContext, SponsorCard } from "@/components/sponsor-ads";

// Position to insert sponsor card (after first few items in list view)
const SPONSOR_INSERT_POSITION = 3;

export default function LayoutClassic({ children }: { children: ReactNode }) {
  const { sponsors } = useSponsorAdsContext();

  // Convert children to array and inject sponsor card after first few items
  const childrenWithSponsor = useMemo(() => {
    const childArray = Children.toArray(children);

    // If no sponsors or not enough children, return original
    if (sponsors.length === 0 || childArray.length < SPONSOR_INSERT_POSITION) {
      return childArray;
    }

    // Insert sponsor card after first few items
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
    <div className="flex flex-col gap-5 max-w-full justify-items-stretch">
      {childrenWithSponsor}
    </div>
  );
}
