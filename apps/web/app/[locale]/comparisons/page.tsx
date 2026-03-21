import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getCachedComparisons } from '@/lib/content';
import { Container } from '@/components/ui/container';
import Hero from '@/components/hero';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';
import { GridBackground, DotBgsible } from '@/components/shared/decorative-bg';

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
    <div className="relative">
      <Hero
        badgeText="Comparisons"
        title={<span className="bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">Explore Comparisons</span>}
        description="Browse generated tool comparisons published from the data repository."
        className="min-h-screen text-center pb-24 relative flex flex-col"
      >
        {/* <div className="absolute inset-x-0 -top-30 w-full h-[350px] flex justify-center items-start -z-10">
          <GridBackground className="w-full h-full" />
        </div> */}
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
                  className="group relative block rounded-sm border-0 ring-1 ring-gray-200/50 bg-white/80 p-4 shadow-md transition-all duration-700 hover:-translate-y-0.5 hover:ring-theme-primary/70 hover:shadow-xl backdrop-blur-xl overflow-hidden dark:ring-white/6 dark:bg-white/3"
                >

                  <div className="relative z-10">
                    <div className="mb-6 flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-500">
                      <span className="rounded-full border border-theme-primary/20 bg-theme-primary/10 px-1.5 py-0.5 text-theme-primary dark:text-theme-primary-400">
                        {comparison.category}
                      </span>
                      <span>{formatComparisonDate(comparison.generated_at, locale)}</span>
                    </div>

                    <h2 className="text-sm mb-6 text-gray-900 transition-colors group-hover:text-theme-primary dark:text-gray-200 text-start">
                      {comparison.title}
                    </h2>

                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{comparison.item_a_name}</span>
                      <span>|</span>
                      <span className="font-medium">{comparison.item_b_name}</span>
                    </div>

                    <p className="mt-3 mb-8 text-start line-clamp-4 text-sm text-gray-600 dark:text-gray-500">{comparison.summary}</p>

                    <div className="flex items-center justify-between text-xs border-t pt-6 border-gray-600 dark:border-gray-700/70">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-theme-primary/10 dark:bg-theme-primary/20 border border-theme-primary/20 dark:border-theme-primary/30 font-medium text-theme-primary dark:text-theme-primary-400 backdrop-blur-sm group-hover:bg-theme-primary/15 dark:group-hover:bg-theme-primary/25 transition-all duration-300">{comparison.dimensions.length} dimensions</span>
                      <span className="text-theme-primary transition-transform group-hover:translate-x-1">Read comparison &rarr;</span>
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
