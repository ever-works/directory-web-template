'use client';

import { ReactNode, Children, useMemo } from 'react';
import { useContainerWidth } from '@/components/ui/container';
import { useSponsorAdsContext, SponsorCard } from '@/components/sponsor-ads';

// Position to insert sponsor card (after first row on desktop = ~3 items)
const SPONSOR_INSERT_POSITION = 3;

export default function LayoutGrid({ children }: { children: ReactNode }) {
	const containerWidth = useContainerWidth();
	const isFluid = containerWidth === 'fluid';
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
			<div key="sponsor-card" className="h-full">
				<SponsorCard sponsors={sponsors} rotationInterval={5000} />
			</div>
		);

		return result;
	}, [children, sponsors]);

	return (
		<div
			className={`grid justify-items-stretch gap-3 sm:gap-3 md:gap-4 lg:gap-4 ${
				isFluid
					? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-6 4xl:grid-cols-7'
					: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
			}`}
		>
			{childrenWithSponsor}
		</div>
	);
}
