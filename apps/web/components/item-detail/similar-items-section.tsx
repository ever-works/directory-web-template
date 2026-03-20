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
			   <div className="flex items-center gap-3 mb-6">
				   {/* 2x2 squares icon with gradient */}
				   <span className="inline-flex items-center justify-center">
					   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						   <defs>
							   <linearGradient id="squares-gradient-similar" x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(90)">
								   <stop offset="0%" stopColor="#6366F1" />
								   <stop offset="100%" stopColor="#A855F7" stop-opacity="0.8" />
							   </linearGradient>
						   </defs>
						   <rect x="3" y="3" width="7" height="7" rx="2" fill="url(#squares-gradient-similar)" />
						   <rect x="14" y="3" width="7" height="7" rx="2" fill="url(#squares-gradient-similar)" />
						   <rect x="3" y="14" width="7" height="7" rx="2" fill="url(#squares-gradient-similar)" />
						   <rect x="14" y="14" width="7" height="7" rx="2" fill="url(#squares-gradient-similar)" />
					   </svg>
				   </span>
				   <h3 className="text-xl font-semibold bg-[linear-gradient(90deg,rgb(99,102,241),rgba(168,85,247,0.8))] bg-clip-text text-transparent">{title}</h3>
				   <span
					   className="text-xs px-3 py-1 rounded-full bg-white/5 dark:bg-white/3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/6"
				   >
					   {allItems.length} result(s)
				   </span>
			   </div>

			{/* Render as a vertical list with full-width items for consistent alignment */}
			<div className="flex flex-col gap-4">
				{allItems.map((similarItem) => (
					<div key={similarItem.slug} className="w-full">
						<Item {...similarItem} is_source_url_active={true} hideIndicatorInSimilarProducts={true} layout="classic" />
					</div>
				))}
			</div>
		</section>
	);
}
