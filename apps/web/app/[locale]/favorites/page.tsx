import { Suspense } from 'react';
import { Container } from '@/components/ui/container';
import { FavoritesClient } from '@/components/favorites/favorites-client';
import { getTranslations } from 'next-intl/server';
import { getCachedItems } from '@/lib/content';
import { requireAuth } from '@/lib/auth/guards';
import { getFeatureFlags } from '@/lib/config/feature-flags';
import { notFound } from 'next/navigation';
// Force dynamic rendering for authenticated pages to prevent auth bypasses
export const dynamic = 'force-dynamic';

export default async function FavoritesPage({
    params,
  }: {
    params: Promise<{locale: string }>;
  }) {
    // Check if favorites feature is enabled
    const flags = getFeatureFlags();
    if (!flags.favorites) {
      notFound(); // Redirect to 404 page
    }

    // Require authentication
    await requireAuth();

    const t = await getTranslations('common');
    const { locale } = await params;
    const { items, categories, total, tags } = await getCachedItems({
        lang: locale,
    });

  return (
    
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <Container maxWidth="7xl" padding="default" useGlobalWidth>  
        <div className="relative z-10 py-16">
      
          <div className="mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-linear-to-r from-gray-900 via-theme-primary-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent tracking-tight leading-tight mb-4">
              {t('FAVORITES')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
              {t('FAVORITES_DESCRIPTION')}
            </p>
          </div>

          {/* Favorites Grid */}
          <Suspense fallback={<FavoritesSkeleton />}>
            <FavoritesClient 
              items={items}
              categories={categories}
              total={total}
              tags={tags}
              basePath={`/`}
            />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}

function FavoritesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-white/80 dark:bg-gray-900/80 rounded-2xl p-6 shadow-lg animate-pulse"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-sm mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-sm w-2/3" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-sm" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-sm w-4/5" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-sm w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
