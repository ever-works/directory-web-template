import { Metadata } from 'next';
import Link from 'next/link';
import { getCachedComparisons } from '@/lib/content';
import { Container } from '@/components/ui/container';
import Hero from '@/components/hero';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';

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
          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {comparisons.map((comparison) => (
              <Link
                key={comparison.slug}
                href={`/comparisons/${comparison.slug}`}
                className="group block rounded-[1.75rem] border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-theme-primary/40 hover:shadow-md dark:border-gray-700/50 dark:bg-[#101624]"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                  <span className="rounded-full border border-theme-primary/20 bg-theme-primary/10 px-1.5 py-0.5 text-theme-primary">
                    {comparison.category}
                  </span>
                  <span>{formatComparisonDate(comparison.generated_at, locale)}</span>
                </div>

                <h2 className="text-sm font-semibold leading-5 text-gray-900 transition-colors group-hover:text-theme-primary dark:text-white">
                  {comparison.title}
                </h2>

                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">{comparison.item_a_name}</span>
                  <span>|</span>
                  <span className="font-medium text-gray-900 dark:text-white">{comparison.item_b_name}</span>
                </div>

                <p className="mt-3 line-clamp-4 text-sm leading-6 text-gray-600 dark:text-gray-400">{comparison.summary}</p>

                <div className="mt-3.5 flex items-center justify-between text-xs">
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
