import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/container';
import Hero from '@/components/hero';
import { MDX } from '@/components/mdx';
import { getCachedComparison } from '@/lib/content';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';

export const revalidate = 600;
export const dynamicParams = true;

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

  return (
    <Hero
      badgeText="Comparison"
      title={<span className="bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">{comparison.title}</span>}
      description={comparison.summary}
      className="text-center"
    >
      <Container maxWidth="5xl" padding="default" useGlobalWidth className="pb-20 space-y-8 text-left">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#101624] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Item A</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{comparison.item_a_name}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Item B</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{comparison.item_b_name}</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Verdict</div>
            <p className="text-gray-800 dark:text-gray-200">{comparison.verdict}</p>
          </div>

          {comparison.dimensions.length > 0 && (
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Dimensions</div>
              {comparison.dimensions.map((dimension) => (
                <div key={dimension.name} className="rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{dimension.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <div className="font-medium mb-1">{comparison.item_a_name}</div>
                      <p>{dimension.item_a_summary}</p>
                    </div>
                    <div>
                      <div className="font-medium mb-1">{comparison.item_b_name}</div>
                      <p>{dimension.item_b_summary}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#101624] p-6">
          {markdown ? (
            <MDX source={markdown} />
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No comparison article content is available yet.</p>
          )}
        </div>
      </Container>
    </Hero>
  );
}
