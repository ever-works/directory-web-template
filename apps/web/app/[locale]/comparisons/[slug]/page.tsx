import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { MDX } from '@/components/mdx';
import { getCachedComparison } from '@/lib/content';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';
import type { ComparisonDimension } from '@/types/comparison';
import { GridBackground, DotBgsible } from '@/components/shared/decorative-bg';
import { ComparisonNav } from './comparison-nav';

export const revalidate = 600;
export const dynamicParams = true;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatComparisonDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale || undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
    <div className="mt-3 flex items-center gap-3">
      <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
        {score ?? '—'}
      </span>
    </div>
  );
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
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
    keywords: ['comparison', detail.comparison.item_a_name, detail.comparison.item_b_name],
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ComparisonPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const detail = await getCachedComparison(slug, { lang: locale });

  if (!detail) notFound();

  const { comparison, markdown } = detail;
  const overallWinner = getWinnerLabel(comparison.verdict_winner, comparison.item_a_name, comparison.item_b_name);
  const isTie = comparison.verdict_winner === 'tie';

  const navSections = [
    { id: 'section-overview', label: 'Overview', iconKey: 'overview' },
    { id: 'section-verdict', label: 'Verdict', iconKey: 'verdict' },
    ...(comparison.dimensions.length > 0 ? [{ id: 'section-dimensions', label: 'Dimensions', iconKey: 'dimensions' }] : []),
    ...(markdown ? [{ id: 'section-article', label: 'Article', iconKey: 'article' }] : []),
  ];

  return (
    <div className="relative min-h-screen">
      {/* Decorative backgrounds */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10 overflow-hidden">
        <GridBackground className="w-full h-full opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-[#0a0e1a]" />
      </div>
      <DotBgsible />

      {/* Floating section navigator */}
      <ComparisonNav sections={navSections} />

      <Container maxWidth="7xl" padding="default" useGlobalWidth className="pt-10 pb-24">

        {/* ── Breadcrumb row ── */}
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link
            href={`/${locale}/comparisons`}
            className="group inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur-sm transition-all hover:border-theme-primary/30 hover:text-theme-primary dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300"
          >
            <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All Comparisons
          </Link>
          <span className="text-xs font-medium tracking-widest text-gray-400 dark:text-gray-500 uppercase">
            {formatComparisonDate(comparison.generated_at, locale)}
          </span>
        </div>

        {/* ── Hero title block ── */}
        <div className="mb-14">
          {/* Category badge */}
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-theme-primary/25 bg-theme-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-theme-primary dark:text-theme-primary-400">
              <span className="h-1.5 w-1.5 rounded-full bg-theme-primary" />
              {comparison.category}
            </span>
            <div className="h-px flex-1 bg-gray-100 dark:bg-white/8" />
          </div>

          {/* Main title — plain, bold, editorial */}
          <h1 className="mb-6 max-w-4xl text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-3xl lg:leading-[1.4]">
            {comparison.title}
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {comparison.summary}
          </p>

          {/* VS pill row */}
          <div className="mt-8 flex items-center gap-4">
            <span className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm">
              {comparison.item_a_name}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">vs</span>
            <span className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm">
              {comparison.item_b_name}
            </span>
          </div>
        </div>

        {/* ── Two-column score cards ── */}
        <div id="section-overview" className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 scroll-mt-24">
          {/* Item A */}
          <div className="relative overflow-hidden rounded-lg border-0 ring-1 ring-theme-primary/20 p-7 shadow-md backdrop-blur-xl dark:ring-theme-primary/25">
            <div className="absolute top-0 right-0 w-36 h-36 translate-x-1/2 -translate-y-1/2 rounded-full bg-theme-primary/8 blur-3xl pointer-events-none" />
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-theme-primary dark:text-theme-primary-400">Option A</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{comparison.item_a_name}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
              {comparison.dimensions[0]?.item_a_summary ?? comparison.summary}
            </p>
            {/* Average score */}
            {comparison.dimensions.some((d) => d.item_a_score != null) && (
              <div className="mt-5 flex items-center gap-3">
                <div className="text-3xl font-extrabold text-theme-primary">
                  {(comparison.dimensions.reduce((s, d) => s + (d.item_a_score ?? 0), 0) / comparison.dimensions.filter((d) => d.item_a_score != null).length).toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-4">avg.<br />score</div>
              </div>
            )}
            {!isTie && overallWinner === comparison.item_a_name && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-theme-primary/10 border border-theme-primary/20 px-3 py-1 text-xs font-semibold text-theme-primary dark:text-theme-primary-400">
                <span>🏆</span> Recommended
              </div>
            )}
          </div>

          {/* Item B */}
          <div className="relative overflow-hidden rounded-lg border-0 ring-1 ring-purple-500/20 p-7 shadow-md backdrop-blur-xl dark:ring-purple-500/25">
            <div className="absolute top-0 left-0 w-36 h-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/8 blur-3xl pointer-events-none" />
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">Option B</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{comparison.item_b_name}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
              {comparison.dimensions[0]?.item_b_summary ?? comparison.summary}
            </p>
            {comparison.dimensions.some((d) => d.item_b_score != null) && (
              <div className="mt-5 flex items-center gap-3">
                <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                  {(comparison.dimensions.reduce((s, d) => s + (d.item_b_score ?? 0), 0) / comparison.dimensions.filter((d) => d.item_b_score != null).length).toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-4">avg.<br />score</div>
              </div>
            )}
            {!isTie && overallWinner === comparison.item_b_name && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-400">
                <span>🏆</span> Recommended
              </div>
            )}
          </div>
        </div>

        {/* ── Verdict callout ── */}
        <section id="section-verdict" className="mb-10 scroll-mt-24 rounded-lg overflow-hidden border-0 ring-1 ring-gray-200/50 bg-white/80 shadow-md backdrop-blur-xl dark:ring-white/6 dark:bg-white/3">
          {/* Accent stripe */}
          <div className="h-px w-full bg-theme-primary/40" />
          <div className="p-7 md:p-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Final Verdict</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isTie ? (
                    "It's a tie"
                  ) : (
                    <>
                      <span className="text-theme-primary">{overallWinner}</span>
                      {' '}wins
                    </>
                  )}
                </div>
              </div>
              <div className={`self-start rounded-2xl px-5 py-3 text-sm font-medium leading-snug ${
                isTie
                  ? 'border border-gray-200/60 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300'
                  : 'border border-theme-primary/20 bg-theme-primary/10 text-theme-primary dark:text-theme-primary-400'
              }`}>
                {isTie ? 'This comparison ends in a tie.' : `${overallWinner} comes out ahead overall.`}
              </div>
            </div>
            <p className="mt-6 text-base leading-8 text-gray-700 dark:text-gray-300">{comparison.verdict}</p>
          </div>
        </section>

        {/* ── Dimensions ── */}
        {comparison.dimensions.length > 0 && (
          <section id="section-dimensions" className="mb-10 scroll-mt-24 rounded-lg">
            <div className="mb-6 flex items-center gap-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Dimension Analysis</div>
              <div className="h-px flex-1 bg-gray-100 dark:bg-white/8" />
              <div className="rounded-full border border-gray-200/60 bg-white/70 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:border-white/10 dark:bg-white/[0.04]">
                {comparison.dimensions.length} categories
              </div>
            </div>

            {/* Sticky column headers */}
            <div className="mb-3 hidden grid-cols-2 gap-4 px-1 md:grid">
              <div className="text-xs font-semibold uppercase tracking-widest text-theme-primary dark:text-theme-primary-400 pl-1">
                {comparison.item_a_name}
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400 pl-1">
                {comparison.item_b_name}
              </div>
            </div>

            <div className="space-y-4">
              {comparison.dimensions.map((dimension) => {
                const winner = getWinnerLabel(dimension.winner, comparison.item_a_name, comparison.item_b_name);
                const aWins = dimension.winner === 'item_a';
                const bWins = dimension.winner === 'item_b';
                return (
                  <article
                    key={dimension.name}
                    className="overflow-hidden rounded-2xl border-0 ring-1 ring-gray-200/50 bg-white/80 backdrop-blur-xl dark:ring-white/6 dark:bg-white/3"
                  >
                    {/* Dimension header */}
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100/60 dark:border-white/6 px-6 py-4">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{dimension.name}</h3>
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        dimension.winner === 'tie'
                          ? 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
                          : 'bg-theme-primary/10 border border-theme-primary/20 text-theme-primary dark:text-theme-primary-400'
                      }`}>
                        {dimension.winner !== 'tie' && <span>🏆</span>}
                        <span>{winner}</span>
                      </div>
                    </div>

                    {/* Score bars + text */}
                    <div className="grid gap-px md:grid-cols-2">
                      <div className={`p-5 ${aWins ? 'bg-theme-primary/[0.03] dark:bg-theme-primary/[0.06]' : ''}`}>
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-theme-primary dark:text-theme-primary-400">
                          {comparison.item_a_name}
                        </div>
                        <ScoreBar score={dimension.item_a_score} tone="left" />
                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{dimension.item_a_summary}</p>
                      </div>
                      <div className={`p-5 border-t md:border-t-0 md:border-l border-gray-100/60 dark:border-white/6 ${bWins ? 'bg-purple-500/[0.03] dark:bg-purple-500/[0.06]' : ''}`}>
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                          {comparison.item_b_name}
                        </div>
                        <ScoreBar score={dimension.item_b_score} tone="right" />
                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{dimension.item_b_summary}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Article / MDX ── */}
        <section id="section-article" className="scroll-mt-24 rounded-3xl border-0 ring-1 ring-gray-200/50 bg-white/80 p-7 shadow-md backdrop-blur-xl dark:ring-white/6 dark:bg-white/3 md:p-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Full Article</div>
            <div className="h-px flex-1 bg-gray-100 dark:bg-white/8" />
          </div>
          {markdown ? (
            <MDX source={markdown} />
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No comparison article content is available yet.</p>
          )}
        </section>

      </Container>
    </div>
  );
}
