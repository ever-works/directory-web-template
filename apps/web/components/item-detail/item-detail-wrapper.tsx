'use client';

import { SponsorAdsProvider } from '@/components/sponsor-ads';
import { ItemDetail, ItemDetailProps } from './item-detail';
import { DotBgsible } from '@/components/shared/decorative-bg';
import { FilterProvider } from '@/components/filters/context/filter-context';

/**
 * Client wrapper component for ItemDetail that provides sponsor ads context.
 * This wrapper is needed because the item detail page is a server component,
 * but SponsorAdsProvider is a client component that needs to use hooks.
 */
export function ItemDetailWrapper(props: ItemDetailProps) {
	return (
		<FilterProvider>
			<div className="relative">
				<DotBgsible reverse />
					<SponsorAdsProvider limit={5}>
						<ItemDetail {...props} />
					</SponsorAdsProvider>
				<DotBgsible />
			</div>
		</FilterProvider>
	);
}
