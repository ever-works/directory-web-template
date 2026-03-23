import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/container';
import Hero from '@/components/hero';
import { MDX } from '@/components/mdx';
import { getCachedComparison } from '@/lib/content';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';
import { generateBreadcrumbSchema, generateComparisonSchema } from '@/lib/seo/schema';
import { getLocalizedUrl } from '@/lib/seo/hreflang';
import type { Locale } from '@/lib/constants';
import type { ComparisonDimension } from '@/types/comparison';

export const revalidate = 600;
export const dynamicParams = true;

function formatComparisonDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale || undefined, {
    month: 'numeric',
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

function ScorePill({ label, score, tone }: { label: string; score?: number; tone: 'left' | 'right' }) {
  const toneClasses = tone === 'left'
    ? 'border-theme-primary/20 bg-theme-primary/10 text-theme-primary'
    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${toneClasses}`}>
      <span>{label}</span>
      <span className="text-sm font-semibold">{score ?? 'N/A'}</span>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const detail = await getCachedComparison(slug, { lang: locale });

  if (!detail) {
    return generateListingMetadata({
      title: 'Comparison',
      path: `/comparisons/${slug}`,
      locale,
    });
  }

  return generateListingMetadata({
    title: detail.comparison.title,
    description: detail.comparison.summary,
    path: `/comparisons/${slug}`,
    locale,
    keywords: ['comparison', detail.comparison.item_a_name, detail.comparison.item_b_name],
  });
}

export default async function ComparisonPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const detail = await getCachedComparison(slug, { lang: locale });

  if (!detail) {
    notFound();
  }

  const { comparison, markdown } = detail;
  const overallWinner = getWinnerLabel(
    comparison.verdict_winner,
    comparison.item_a_name,
    comparison.item_b_name
  );
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
    { name: 'Comparisons', url: getLocalizedUrl('/comparisons', locale as Locale) },
    { name: comparison.title, url: comparisonUrl }
  ]);

  return (
    <Hero
      badgeText="Comparison"
      title={
        <span className="bg-linear-to-r from-theme-primary-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
          {comparison.title}
        </span>
      }
      description={comparison.summary}
      className="text-center"
    >
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
      <Container maxWidth="7xl" padding="default" useGlobalWidth className="pb-20 text-left">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href={`/${locale}/comparisons`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-theme-primary dark:text-gray-300"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back to comparisons</span>
          </Link>
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            {formatComparisonDate(comparison.generated_at, locale)}
          </div>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold text-gray-900 dark:text-white">{comparison.item_a_name}</span>
          <span>|</span>
          <span className="font-semibold text-gray-900 dark:text-white">{comparison.item_b_name}</span>
          <span>|</span>
          <span className="rounded-full border border-theme-primary/20 bg-theme-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-theme-primary">
            {comparison.category}
          </span>
        </div>

        <div className="space-y-8">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-[#101624] md:p-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              Summary
            </h2>
            <p className="text-base leading-8 text-gray-700 dark:text-gray-200">{comparison.summary}</p>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-[#101624] md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Verdict
                </h2>
                <div className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
                  Winner: {overallWinner}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {comparison.verdict_winner === 'tie' ? 'This comparison ends in a tie.' : `${overallWinner} comes out ahead overall.`}
              </div>
            </div>
            <p className="text-base leading-8 text-gray-700 dark:text-gray-200">{comparison.verdict}</p>
          </section>

          {comparison.dimensions.length > 0 && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-[#101624] md:p-8">
              <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Dimensions
              </h2>
              <div className="space-y-5">
                {comparison.dimensions.map((dimension) => (
                  <article key={dimension.name} className="rounded-2xl border border-gray-200/80 bg-gray-50/60 p-5 dark:border-gray-700/50 dark:bg-gray-900/30">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{dimension.name}</h3>
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        <span>Winner:</span>
                        <span>{getWinnerLabel(dimension.winner, comparison.item_a_name, comparison.item_b_name)}</span>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-theme-primary/15 bg-white p-4 dark:border-theme-primary/20 dark:bg-[#0d1524]">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-base font-semibold text-gray-900 dark:text-white">{comparison.item_a_name}</div>
                          <ScorePill label="Score" score={dimension.item_a_score} tone="left" />
                        </div>
                        <p className="text-sm leading-7 text-gray-700 dark:text-gray-300">{dimension.item_a_summary}</p>
                      </div>

                      <div className="rounded-2xl border border-emerald-500/15 bg-white p-4 dark:border-emerald-500/20 dark:bg-[#0d1524]">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-base font-semibold text-gray-900 dark:text-white">{comparison.item_b_name}</div>
                          <ScorePill label="Score" score={dimension.item_b_score} tone="right" />
                        </div>
                        <p className="text-sm leading-7 text-gray-700 dark:text-gray-300">{dimension.item_b_summary}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-[#101624] md:p-8">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              Article
            </h2>
            {markdown ? (
              <MDX source={markdown} />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No comparison article content is available yet.</p>
            )}
          </section>
        </div>
      </Container>
    </Hero>
  );
}
