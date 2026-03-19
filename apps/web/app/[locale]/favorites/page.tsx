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
    
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <Container maxWidth="7xl" padding="default" useGlobalWidth>  
        <div className="relative z-10 py-8">
      
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-3">
              {t('FAVORITES')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
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
          className="bg-white dark:bg-white/3 rounded-xl p-6 border border-gray-200 dark:border-white/6 animate-pulse"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-white/6 rounded-xl" />
            <div className="flex-1">
              <div className="h-4 bg-gray-100 dark:bg-white/6 rounded mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-white/6 rounded w-2/3" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 dark:bg-white/6 rounded" />
            <div className="h-3 bg-gray-100 dark:bg-white/6 rounded w-4/5" />
            <div className="h-3 bg-gray-100 dark:bg-white/6 rounded w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
