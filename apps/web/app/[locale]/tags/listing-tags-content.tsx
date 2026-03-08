'use client';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Hero from '@/components/hero';
import { TagsCards } from '@/components/tags-cards';
import { Paginate } from '@/components/filters/components/pagination/paginate';
import { totalPages } from '@/lib/paginate';
import { Tag } from '@/lib/content';
import { GridSkeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';

export function ListingTagsContent({
	tags,
	total,
	page,
	basePath
}: {
	tags: Tag[];
	total: number;
	page: number;
	basePath: string;
}) {
	const t = useTranslations('listing');
	const tCommon = useTranslations('common');

	return (
		<Suspense fallback={<GridSkeleton count={12} />}>
			<Hero
				badgeText={t('TAGS')}
				title={
					<span className="bg-linear-to-r from-theme-primary via-purple-500 to-theme-primary bg-clip-text text-transparent">
						{t('TAGS', { defaultValue: 'Tags' })}
					</span>
				}
				description={tCommon('TAGS_DESCRIPTION', {
					defaultValue: 'Browse all tags in our directory.'
				})}
				className="min-h-screen text-center"
			>
				<Container maxWidth="7xl" padding="lg" useGlobalWidth>
					<TagsCards tags={tags} />
				</Container>
				<footer className="flex items-center justify-center">
					<Paginate basePath={basePath} initialPage={page} total={totalPages(total)} />
				</footer>
			</Hero>
		</Suspense>
	);
}
