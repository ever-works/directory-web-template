import { Metadata } from 'next';
import Link from 'next/link';
import { getCachedComparisons } from '@/lib/content';
import { Container } from '@/components/ui/container';
import Hero from '@/components/hero';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';

export const revalidate = 600;
export const dynamicParams = true;

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
      title={<span className="bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">Explore Comparisons</span>}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-12">
            {comparisons.map((comparison) => (
              <Link
                key={comparison.slug}
                href={`/comparisons/${comparison.slug}`}
                className="block rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#101624] p-6 transition-colors hover:border-theme-primary/40"
              >
                <div className="text-xs uppercase tracking-wide text-theme-primary mb-3">{comparison.category}</div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{comparison.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4 mb-4">{comparison.summary}</p>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {new Date(comparison.generated_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </Hero>
  );
}
