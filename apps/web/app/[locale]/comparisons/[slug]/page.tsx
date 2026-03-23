import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { MDX } from '@/components/mdx';
import { getCachedComparison } from '@/lib/content';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';
import { generateBreadcrumbSchema, generateComparisonSchema } from '@/lib/seo/schema';
import { getLocalizedUrl } from '@/lib/seo/hreflang';
import type { Locale } from '@/lib/constants';
import type { ComparisonDimension } from '@/types/comparison';
import { DotBgsible } from '@/components/shared/decorative-bg';
import DecorativeBg from '@/components/shared/decorative-bg';
import { ComparisonNav } from './comparison-nav';
import { Trophy } from 'lucide-react';

export const revalidate = 600;
export const dynamicParams = true;

function formatComparisonDate(value: string, locale: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(locale || undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

function getWinnerLabel(
	winner: ComparisonDimension['winner'] | 'item_a' | 'item_b' | 'tie' | undefined,
	itemAName: string,
	itemBName: string
): string {
	if (winner === 'item_a') return itemAName;
	if (winner === 'item_b') return itemBName;
	if (winner === 'tie') return 'Tie';
	return 'No clear winner';
}

/** Simple 0-10 score bar */
function ScoreBar({ score, tone }: { score?: number; tone: 'left' | 'right' }) {
	const pct = score != null ? Math.min(100, Math.max(0, score * 10)) : 0;
	const barColor = tone === 'left' ? 'bg-theme-primary' : 'bg-purple-500';
	return (
		<div className="mt-3 flex items-center gap-3 w-5/6">
			<div className="h-1 flex-1 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
				<div
					className={`h-full rounded-full transition-all duration-700 ${barColor}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="w-12 text-right text-3xl font-extralight text-gray-700 dark:text-gray-300">
				{score ?? '—'}
			</span>
		</div>
	);
}

export async function generateMetadata({
	params
}: {
	params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
	const { locale, slug } = await params;
	const detail = await getCachedComparison(slug, { lang: locale });

	if (!detail) {
		return generateListingMetadata({ title: 'Comparison', path: `/comparisons/${slug}`, locale });
	}

	return generateListingMetadata({
		title: detail.comparison.title,
		description: detail.comparison.summary,
		path: `/comparisons/${slug}`,
		locale,
		keywords: ['comparison', detail.comparison.item_a_name, detail.comparison.item_b_name]
	});
}


export default async function ComparisonPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
	const { locale, slug } = await params;
	const detail = await getCachedComparison(slug, { lang: locale });

	if (!detail) notFound();

	const { comparison, markdown } = detail;
	const t = await getTranslations('comparisons');
	const overallWinner = getWinnerLabel(comparison.verdict_winner, comparison.item_a_name, comparison.item_b_name);
	const isTie = comparison.verdict_winner === 'tie';

	const comparisonUrl = getLocalizedUrl(`/comparisons/${slug}`, locale as Locale);
	const comparisonSchema = generateComparisonSchema({
		title: comparison.title,
		description: comparison.summary,
		url: comparisonUrl,
		datePublished: comparison.generated_at,
		itemAName: comparison.item_a_name,
		itemBName: comparison.item_b_name,
		category: comparison.category
	});
	const breadcrumbSchema = generateBreadcrumbSchema([
		{ name: 'Home', url: getLocalizedUrl('/', locale as Locale) },
		{ name: t('ALL_COMPARISONS'), url: getLocalizedUrl('/comparisons', locale as Locale) },
		{ name: comparison.title, url: comparisonUrl }
	]);

	const navSections = [
		{ id: 'section-overview', label: t('NAV_OVERVIEW'), iconKey: 'overview' },
		{ id: 'section-verdict', label: t('NAV_VERDICT'), iconKey: 'verdict' },
		...(comparison.dimensions.length > 0
			? [{ id: 'section-dimensions', label: t('NAV_DIMENSIONS'), iconKey: 'dimensions' }]
			: []),
		...(markdown ? [{ id: 'section-article', label: t('NAV_ARTICLE'), iconKey: 'article' }] : [])
	];

	return (
		<div className="relative min-h-screen">
			{/* JSON-LD structured data */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(comparisonSchema).replace(/</g, '\\u003c')
				}}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c')
				}}
			/>

			{/* Decorative backgrounds */}
			<DecorativeBg reverse className='-mt-2'/>
			<DotBgsible />

			{/* Floating section navigator */}
			<ComparisonNav sections={navSections} />

			<Container maxWidth="7xl" padding="default" useGlobalWidth className="pt-10 pb-24">
				<div className="mb-10 flex items-center justify-between gap-4">
					<Link
						href={`/${locale}/comparisons`}
						className="group inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur-sm transition-all hover:border-theme-primary/30 hover:text-theme-primary dark:border-white/10 dark:bg-white/4 dark:text-gray-300"
					>
						<svg
							className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
						</svg>
						{t('ALL_COMPARISONS')}
					</Link>
					<span className="text-xs font-medium tracking-widest text-gray-400 dark:text-gray-500 uppercase">
						{formatComparisonDate(comparison.generated_at, locale)}
					</span>
				</div>

				<div className="mb-14">
					{/* Category badge */}
					<div className="mb-6 flex items-center gap-3">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-theme-primary/25 bg-theme-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-theme-primary dark:text-theme-primary-400">
							<span className="h-1.5 w-1.5 rounded-full bg-theme-primary" />
							{comparison.category}
						</span>
						<div className="h-px flex-1 bg-gray-100 dark:bg-white/8" />
					</div>

					<h1 className="mb-6 max-w-4xl text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-3xl lg:leading-[1.4]">
						{comparison.title}
					</h1>

					<p className="max-w-4xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
						{comparison.summary}
					</p>

					{/* VS pill row */}
					<div className="mt-8 flex items-center gap-4">
						<span className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/4 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm">
							{comparison.item_a_name}
						</span>
						<span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
							vs
						</span>
						<span className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/4 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm">
							{comparison.item_b_name}
						</span>
					</div>
				</div>

				<div id="section-overview" className="mb-10 lg:mb-40 grid grid-cols-1 gap-4 md:grid-cols-2 scroll-mt-24">
					{/* Item A */}
				<div className="relative overflow-hidden rounded-lg border-0 ring-1 ring-theme-primary/20 p-7 shadow-xs backdrop-blur-xl dark:ring-theme-primary/25 flex flex-col">
					<div className="absolute top-0 right-0 w-36 h-36 translate-x-1/2 -translate-y-1/2 rounded-full bg-theme-primary/8 blur-3xl pointer-events-none" />
					<div className="mb-1 text-[10px] font-light uppercase tracking-widest text-theme-primary dark:text-theme-primary-400">
						{t('OPTION_A')}
						</div>
						<h2 className="text-2xl font-bold text-gray-900 dark:text-white">{comparison.item_a_name}</h2>
						<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
							{comparison.dimensions[0]?.item_a_summary ?? comparison.summary}
						</p>
						{/* Average score */}
						<div className="mt-auto flex items-end gap-5">
							{comparison.dimensions.some((d) => d.item_a_score != null) && (
								<div className="mt-5 flex items-center gap-3">
									<div className="text-5xl font-extralight text-theme-primary">
										{(
											comparison.dimensions.reduce((s, d) => s + (d.item_a_score ?? 0), 0) /
											comparison.dimensions.filter((d) => d.item_a_score != null).length
										).toFixed(1)}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400 leading-4">
										{t('AVG_LABEL')}
										<br />
										{t('SCORE_LABEL')}
									</div>
								</div>
							)}
							{!isTie && overallWinner === comparison.item_a_name && (
								<div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-theme-primary/10 border border-theme-primary/20 px-3 py-1 text-xs font-light text-theme-primary dark:text-theme-primary-400">
									<Trophy className="w-3 h-3 text-amber-600" /> {t('RECOMMENDED')}
								</div>
							)}
						</div>
					</div>

					{/* Item B */}
					<div className="relative overflow-hidden rounded-lg border-0 ring-1 ring-purple-500/20 p-7 shadow-xs backdrop-blur-xl dark:ring-purple-500/25 flex flex-col">
						<div className="absolute top-0 left-0 w-36 h-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/8 blur-3xl pointer-events-none" />
						<div className="mb-1 text-[10px] font-light uppercase tracking-widest text-purple-600 dark:text-purple-400">
							{t('OPTION_B')}
						</div>
						<h2 className="text-2xl font-bold text-gray-900 dark:text-white">{comparison.item_b_name}</h2>
						<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
							{comparison.dimensions[0]?.item_b_summary ?? comparison.summary}
						</p>
						<div className="mt-auto flex items-end gap-5">
							{comparison.dimensions.some((d) => d.item_b_score != null) && (
								<div className="mt-5 flex items-center gap-3">
									<div className="text-5xl font-extralight text-purple-600 dark:text-purple-400">
										{(
											comparison.dimensions.reduce((s, d) => s + (d.item_b_score ?? 0), 0) /
											comparison.dimensions.filter((d) => d.item_b_score != null).length
										).toFixed(1)}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400 leading-4">
										{t('AVG_LABEL')}
										<br />
										{t('SCORE_LABEL')}
									</div>
								</div>
							)}
							{!isTie && overallWinner === comparison.item_b_name && (
								<div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-light text-purple-700 dark:text-purple-400">
									<Trophy className="w-3 h-3 text-amber-600" /> {t('RECOMMENDED')}
								</div>
							)}
						</div>
					</div>
				</div>

				<section
					id="section-verdict"
					className="mb-10 lg:mb-40 px-1 py-1 scroll-mt-24 rounded-lg overflow-hidden border-0 ring-1 dark:ring-white/6 ring-gray-200/50"
				>
					{/* Accent stripe */}
					<div className="bg-gray-100 rounded-lg dark:ring-white/6 ring-gray-200/50 dark:bg-white/4">
						<div className="p-7 md:px-9 md:py-16">
							<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
								<div className="flex-1">
									<div className="mb-2 text-[10px] font-light uppercase tracking-widest text-gray-400 dark:text-gray-500">
										{t('FINAL_VERDICT')}
									</div>
									<div className="text-2xl font-bold text-gray-900 dark:text-white">
										{isTie ? (
											t('ITS_A_TIE')
										) : (
											<>
												<span className="text-theme-primary">{overallWinner}</span>{' '}{t('WINS')}
											</>
										)}
									</div>
								</div>
								<div
									className={`self-start rounded-2xl px-5 py-3 text-sm font-medium leading-snug ${
										isTie
											? 'border border-gray-200/60 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/4 dark:text-gray-300'
											: 'border border-double border-theme-primary/20 bg-theme-primary/10 text-theme-primary dark:text-theme-primary-400'
									}`}
								>
									{isTie
										? t('TIE_DESCRIPTION')
										: t('WINNER_DESCRIPTION', { winner: overallWinner })}
								</div>
							</div>
							<p className="mt-6 text-base leading-7 text-gray-700 dark:text-gray-400">
								{comparison.verdict}
							</p>
						</div>
					</div>
				</section>

				{comparison.dimensions.length > 0 && (
					<section id="section-dimensions" className="mb-10 lg:mb-40 scroll-mt-24 rounded-lg">
						<div className="mb-6 flex items-center gap-3">
							<div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
								{t('DIMENSION_ANALYSIS')}
							</div>
							<div className="h-px flex-1 bg-gray-100 dark:bg-white/8" />
							<div className="rounded-full border border-gray-200/60 bg-white/70 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:border-white/10 dark:bg-white/4">
								{t('CATEGORIES_COUNT', { count: comparison.dimensions.length })}
							</div>
						</div>

						{/* Sticky column headers */}
						<div className="mb-3 hidden grid-cols-2 gap-4 px-1 md:grid">
							<div className="text-xs flex items-start gap-3 font-semibold uppercase tracking-widest text-theme-primary dark:text-theme-primary-400 pl-1">
                <div>
                  <div className='w-4 h-4 rounded-full border border-theme-primary-400' />
                  <div className='h-5 w-px bg-theme-primary-400 mx-auto' />
                </div>
								{comparison.item_a_name}
							</div>
							<div className="text-xs flex items-start gap-3 font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400 pl-1">
                <div>
                  <div className='w-4 h-4 rounded-full border border-purple-400' />
                  <div className='h-5 w-px bg-purple-400 mx-auto' />
                </div>
								{comparison.item_b_name}
							</div>
						</div>

						<div className="space-y-4">
							{comparison.dimensions.map((dimension) => {
								const winner = getWinnerLabel(
									dimension.winner,
									comparison.item_a_name,
									comparison.item_b_name
								);
								const aWins = dimension.winner === 'item_a';
								const bWins = dimension.winner === 'item_b';
								return (
									<article
										key={dimension.name}
										className="overflow-hidden mb-4 md:mb-10 rounded-lg border-0 ring-1 ring-gray-200/50 bg-white/80 backdrop-blur-xl dark:ring-white/6 dark:bg-transparent"
									>
										{/* Dimension header */}
										<div className="flex items-center gap-4 border-b border-gray-100/60 dark:border-white/6 px-8 py-4">
											<h3 className="text-base font-semibold text-gray-900 dark:text-white">
												{dimension.name}
											</h3>
											<div
												className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-light ${
													dimension.winner === 'tie'
														? 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
														: 'bg-theme-primary/10 border border-theme-primary/20 text-theme-primary dark:text-theme-primary-400'
												}`}
											>
												{dimension.winner !== 'tie' && <Trophy className="w-3 h-3 text-amber-600" />}
												<span>{winner}</span>
											</div>
										</div>

										{/* Score bars + text */}
										<div className="grid gap-px md:grid-cols-2">
											<div
												className={`p-5 ${aWins ? 'bg-theme-primary/3 dark:bg-theme-primary/6' : ''}`}
											>
												<div className="mb-1 text-[10px] font-light uppercase tracking-widest text-theme-primary dark:text-theme-primary-400">
													{comparison.item_a_name}
												</div>
												<ScoreBar score={dimension.item_a_score} tone="left" />
												<p className="my-6 text-sm leading-6 text-gray-600 dark:text-gray-400">
													{dimension.item_a_summary}
												</p>
											</div>
											<div
												className={`p-5 border-t md:border-t-0 md:border-l border-gray-100/60 dark:border-white/6 ${bWins ? 'bg-purple-500/3 dark:bg-purple-500/6' : ''}`}
											>
												<div className="mb-1 text-[10px] font-light uppercase tracking-widest text-purple-600 dark:text-purple-400">
													{comparison.item_b_name}
												</div>
												<ScoreBar score={dimension.item_b_score} tone="right" />
												<p className="my-6 text-sm leading-6 text-gray-600 dark:text-gray-400">
													{dimension.item_b_summary}
												</p>
											</div>
										</div>
									</article>
								);
							})}
						</div>
					</section>
				)}

				<section id="section-article" className="scroll-mt-24">
					<div className="mb-6 flex items-center gap-3">
						<div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
							{t('FULL_ARTICLE')}
						</div>
						<div className="h-px flex-1 bg-gray-100 dark:bg-white/8" />
					</div>
					{markdown ? (
            <div className='w-5/6 mx-auto'>
						  <MDX source={markdown} />
            </div>
					) : (
						<p className="text-gray-500 dark:text-gray-400">
							{t('NO_ARTICLE')}
						</p>
					)}
				</section>
			</Container>
		</div>
	);
}
