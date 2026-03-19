'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, ExternalLink, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeaturedItemsSection, FeaturedItem } from '@/hooks/use-feature-items-section';
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

interface FeaturedItemsSectionProps {
  className?: string;
  title?: string;
  description?: string;
  limit?: number;
  showViewAll?: boolean;
  variant?: 'default' | 'compact' | 'hero';
}

export function FeaturedItemsSection({
  className,
  title = "Featured Items",
  description = "Discover our handpicked selection of top-rated tools and resources",
  limit = 6,
  showViewAll = true,
  variant = 'default'
}: FeaturedItemsSectionProps) {
  const { features, isPending: isFeaturesLoading, isSimulationActive } = useFeatureFlagsWithSimulation();
  const { featuredItems, isLoading, isError, error } = useFeaturedItemsSection({
    limit,
    enabled: true,
  });

  // Hide when feature is disabled due to simulation
  if (!isFeaturesLoading && !features.featuredItems && isSimulationActive) {
    return null;
  }

  // Hide featured items section when feature is disabled (database not configured)
  if (isFeaturesLoading || !features.featuredItems) {
    return null;
  }

  if (isLoading) {
    return (
      <section className={cn("py-12", className)}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: limit }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded-sm mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded-sm mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded-sm w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className={cn("py-12", className)}>
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-red-500">Failed to load featured items: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (featuredItems.length === 0) {
    return null;
  }

  return (
    <section className={cn("py-12", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            <h2 className="text-3xl font-bold">{title}</h2>
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>
        </div>

        <div className={cn(
          "grid gap-6",
          variant === 'hero' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
          variant === 'compact' ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6" :
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}>
          {featuredItems.map((item, index) => (
            <FeaturedItemCard
              key={item.id}
              item={item}
              variant={variant}
              index={index}
            />
          ))}
        </div>

        {showViewAll && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg">
              <Link href="/discover/1">
                View All Items
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

interface FeaturedItemCardProps {
  item: FeaturedItem;
  variant: 'default' | 'compact' | 'hero';
  index: number;
}

function FeaturedItemCard({ item, variant, index }: FeaturedItemCardProps) {
  const isExpiring = item.featuredUntil && new Date(item.featuredUntil) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  if (variant === 'compact') {
    return (
      <Link href={`/items/${item.itemSlug}`}>
        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 text-center">
            <div className="relative mb-3">
              {item.itemIconUrl ? (
                <Image
                  src={item.itemIconUrl}
                  alt={item.itemName}
                  width={48}
                  height={48}
                  className="w-12 h-12 mx-auto rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 mx-auto bg-linear-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              )}
              <div className="absolute -top-1 -right-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              </div>
            </div>
            <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.itemName}</h3>
            {item.itemCategory && (
              <Badge variant="secondary" className="text-xs">
                {item.itemCategory}
              </Badge>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  }

  if (variant === 'hero') {
    return (
      <Link href={`/items/${item.itemSlug}`}>
        <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-2 border-yellow-200 dark:border-yellow-800 bg-linear-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {item.itemIconUrl ? (
                  <Image
                    src={item.itemIconUrl}
                    alt={item.itemName}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-linear-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 rounded-xl flex items-center justify-center">
                    <Star className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg mb-1">{item.itemName}</h3>
                  {item.itemCategory && (
                    <Badge variant="secondary" className="mb-2">
                      {item.itemCategory}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  #{index + 1}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {item.itemDescription && (
              <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                {item.itemDescription}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="sm" className="group-hover:bg-yellow-600 group-hover:text-white">
                  View Details
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
              {isExpiring && (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">Expires Soon</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Default variant
  return (
    <Link href={`/items/${item.itemSlug}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-yellow-200 dark:border-yellow-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {item.itemIconUrl ? (
                <Image
                  src={item.itemIconUrl}
                  alt={item.itemName}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-linear-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-1">{item.itemName}</h3>
                {item.itemCategory && (
                  <Badge variant="secondary" className="text-xs">
                    {item.itemCategory}
                  </Badge>
                )}
              </div>
            </div>
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {item.itemDescription && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {item.itemDescription}
            </p>
          )}
          <div className="flex items-center justify-between">
            <Button size="sm" variant="outline" className="group-hover:bg-yellow-50 group-hover:border-yellow-300">
              View Details
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
            {isExpiring && (
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Clock className="w-3 h-3" />
                <span className="text-xs">Expires Soon</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
