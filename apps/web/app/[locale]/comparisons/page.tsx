import { Metadata } from 'next';
import Link from 'next/link';
import { getCachedComparisons } from '@/lib/content';
import { Container } from '@/components/ui/container';
import Hero from '@/components/hero';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';

export const revalidate = 600;
export const dynamicParams = true;

function formatComparisonDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const { total } = await getCachedComparisons({ lang: locale });

  return generateListingMetadata({
    title: 'Comparisons',
    path: '/comparisons',
    locale,
    itemCount: total,
    keywords: ['comparisons', 'vs', 'directory', 'tools'],
  });
}

export default async function ComparisonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { comparisons } = await getCachedComparisons({ lang: locale });

  return (
    <Hero
      badgeText="Comparisons"
      title={<span className="bg-linear-to-r from-theme-primary-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">Explore Comparisons</span>}
      description="Browse generated tool comparisons published from the data repository."
      className="text-center flex flex-col"
    >
      <Container maxWidth="7xl" padding="default" useGlobalWidth className="pb-20">
        {comparisons.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No comparisons found</h3>
            <p className="text-gray-600 dark:text-gray-400">No comparison pages are available in this directory yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 mt-12 lg:grid-cols-2">
            {comparisons.map((comparison) => (
              <Link
                key={comparison.slug}
                href={`/comparisons/${comparison.slug}`}
                className="group block rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-theme-primary/40 hover:shadow-lg dark:border-gray-700/50 dark:bg-[#101624]"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  <span className="rounded-full border border-theme-primary/20 bg-theme-primary/10 px-3 py-1 text-theme-primary">
                    {comparison.category}
                  </span>
                  <span>{formatComparisonDate(comparison.generated_at)}</span>
                </div>

                <h2 className="text-2xl font-semibold text-gray-900 transition-colors group-hover:text-theme-primary dark:text-white">
                  {comparison.title}
                </h2>

                <div className="mt-4 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">{comparison.item_a_name}</span>
                  <span>|</span>
                  <span className="font-medium text-gray-900 dark:text-white">{comparison.item_b_name}</span>
                </div>

                <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-400">{comparison.summary}</p>

                <div className="mt-6 flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{comparison.dimensions.length} dimensions</span>
                  <span className="font-semibold text-theme-primary transition-transform group-hover:translate-x-1">Read comparison &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </Hero>
  );
}
