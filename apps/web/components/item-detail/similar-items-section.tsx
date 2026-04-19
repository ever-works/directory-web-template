import type { ItemData } from '@/lib/content';
import Item from '../item';

interface SimilarItemsSectionProps {
	allItems: ItemData[];
	className?: string;
	title?: string;
}

export function SimilarItemsSection({ allItems, className, title = 'Similar Products' }: SimilarItemsSectionProps) {
	return (
		<section className={`w-full ${className ?? ''}`}>
			<div className="flex items-center justify-between mb-5">
				<h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
					{title}
				</h3>
				<span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
					{allItems.length}
				</span>
			</div>

			<div className="flex flex-col divide-y divide-gray-100 dark:divide-white/6">
				{allItems.map((similarItem) => (
					<div key={similarItem.slug} className="w-full py-1 first:pt-0 last:pb-0">
						<Item
							{...similarItem}
							is_source_url_active={true}
							hideIndicatorInSimilarProducts={true}
							layout="classic"
						/>
					</div>
				))}
			</div>
		</section>
	);
}
