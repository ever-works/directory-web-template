import { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCachedComparisons } from '@/lib/content';
import { Container } from '@/components/ui/container';
import Hero from '@/components/hero';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';
import { DotBgsible } from '@/components/shared/decorative-bg';
import DecorativeBg from '@/components/shared/decorative-bg';

export const revalidate = 600;
export const dynamicParams = true;

function formatComparisonDate(value: string, locale: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(locale || undefined, {
		month: 'numeric',
		day: 'numeric',
		year: 'numeric'
	});
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params;
	const [{ total }, t] = await Promise.all([
		getCachedComparisons({ lang: locale }),
		getTranslations({ locale, namespace: 'comparisons' })
	]);

	return generateListingMetadata({
		title: t('BADGE_TEXT'),
		path: '/comparisons',
		locale,
		itemCount: total,
		keywords: ['comparisons', 'vs', 'directory', 'tools']
	});
}

export default async function ComparisonsPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const [{ comparisons }, t] = await Promise.all([
		getCachedComparisons({ lang: locale }),
		getTranslations({ locale, namespace: 'comparisons' })
	]);

	return (
		<div className="relative">
			<Hero
				badgeText={t('BADGE_TEXT')}
				title={
					<span className="bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">
						{t('TITLE')}
					</span>
				}
				description={t('DESCRIPTION')}
				className="min-h-screen text-center pb-24 relative flex flex-col"
			>
				{/* <div className="absolute inset-x-0 -top-30 w-full h-[350px] flex justify-center items-start -z-10">
          <GridBackground className="w-full h-full" />
        </div> */}
				<Container maxWidth="7xl" padding="default" useGlobalWidth className="pb-20">
					<DecorativeBg reverse className="-mt-10" />
					{comparisons.length === 0 ? (
						<div className="text-center py-16">
							<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
								{t('EMPTY_STATE_TITLE')}
							</h3>
							<p className="text-gray-600 dark:text-gray-400">{t('EMPTY_STATE_DESC')}</p>
						</div>
					) : (
						<div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
							{comparisons.map((comparison) => (
								<Link
									key={comparison.slug}
									href={`/${locale}/comparisons/${comparison.slug}`}
									className="group relative rounded-sm border-0 ring-1 ring-gray-200/50 bg-white/80 p-6 shadow-md transition-all duration-700 hover:ring-theme-primary/70 dark:hover:ring-white/40 hover:shadow-xl overflow-hidden dark:ring-white/6 dark:bg-white/3"
								>
									<div className="relative z-10">
										<div className="mb-6 flex flex-wrap items-end gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-500">
											<span className="rounded-full border border-amber-600 bg-amber-500/10 px-1.5 py-0.5 text-amber-600 dark:text-amber-600">
												{comparison.category}
											</span>
											<span className='font-extralight'>{formatComparisonDate(comparison.generated_at, locale)}</span>
										</div>

										<h2 className="text-sm mb-4 font-normal md:mb-10 text-gray-900 leading-6 transition-colors group-hover:text-theme-primary dark:text-gray-200 text-start">
											{comparison.title}
										</h2>

										<div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
											<span className="font-extralight">{comparison.item_a_name}</span>
											<span>|</span>
											<span className="font-extralight">{comparison.item_b_name}</span>
										</div>

										<p className="mt-3 mb-8 text-start line-clamp-4 text-sm text-gray-400 dark:text-gray-500">
											{comparison.summary}
										</p>

										<div className="flex items-center justify-between text-xs border-t pt-6 border-gray-300 dark:border-gray-700/30">
											<span className="inline-flex items-center px-2 py-1 rounded-full bg-theme-primary/10 dark:bg-white/4 border border-theme-primary/20 dark:border-white/30 font-medium text-theme-primary dark:text-white/60 group-hover:dark:text-white/90 dark:group-hover:bg-white/6 transition-all duration-300">
												{t('DIMENSIONS_COUNT', { count: comparison.dimensions.length })}
											</span>
											<span className="text-theme-primary transition-transform group-hover:translate-x-1">
												{t('READ_COMPARISON')} &rarr;
											</span>
										</div>
									</div>
								</Link>
							))}
						</div>
					)}
				</Container>
			</Hero>
			<DotBgsible />
		</div>
	);
}
