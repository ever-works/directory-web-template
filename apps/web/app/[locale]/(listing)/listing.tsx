import { FilterProvider } from '@/components/filters/context/filter-context';
import { getTranslations, getLocale } from 'next-intl/server';
import { Category, ItemData, Tag, getCachedHeroContent } from '@/lib/content';
import GlobalsClient from './globals-client';
import Hero from '@/components/hero';
import CustomHero from '@/components/custom-hero';
import { FilterURLParser } from '@/components/filters/filter-url-parser';
import { configManager } from '@/lib/config-manager';
import { getHeroBadgeText, getHeroTitle, getHeroTitleGradient, getHeroDescription } from '@/lib/utils/settings';

type ListingProps = {
	total: number;
	start: number;
	page: number;
	basePath: string;
	categories: Category[];
	tags: Tag[];
	items: ItemData[];
	initialTag?: string | null;
	initialCategory?: string | null;
};

export default async function Listing(props: ListingProps) {
	const t = await getTranslations('listing');
	const locale = await getLocale();
	const config = configManager.getConfig();
	const homepageSettings = config.settings?.homepage;
	const heroEnabled = homepageSettings?.hero_enabled ?? true;
	const searchEnabled = homepageSettings?.search_enabled ?? true;
	const defaultView = homepageSettings?.default_view ?? 'classic';
	const defaultSort = homepageSettings?.default_sort ?? 'popularity';

	// Hero text: use settings values with translation fallback
	const heroBadgeText = getHeroBadgeText() ?? t('INTRODUCING_EVER_WORKS');
	const heroTitle = getHeroTitle() ?? t('THE_BEST');
	const heroTitleGradient = getHeroTitleGradient() ?? t('DIRECTORY_WEBSITE_TEMPLATE');
	const heroDescription = getHeroDescription() ?? t('DEMO_DESCRIPTION');

	// Check for custom hero configuration
	const customHeroConfig = config.custom_hero;
	const customHeroEnabled = customHeroConfig?.enabled && customHeroConfig?.source;

	// Fetch custom hero content if enabled
	let customHeroContent = null;
	if (customHeroEnabled) {
		customHeroContent = await getCachedHeroContent(customHeroConfig.source, locale);
	}

	// Determine which hero to render
	const shouldShowCustomHero = customHeroEnabled && customHeroContent;

	const filterProviderKey = `${locale}:${props.basePath}:${props.initialCategory ?? ''}:${props.initialTag ?? ''}`;

	return (
		<FilterProvider
			key={filterProviderKey}
			initialTag={props.initialTag}
			initialCategory={props.initialCategory}
			initialSortBy={defaultSort}
		>
			<FilterURLParser />
			{shouldShowCustomHero && customHeroContent ? (
				<CustomHero
					content={customHeroContent.content}
					frontmatter={customHeroContent.frontmatter}
					className="min-h-screen"
				>
					<GlobalsClient {...props} searchEnabled={searchEnabled} defaultView={defaultView} />
				</CustomHero>
			) : heroEnabled ? (
				<Hero
					badgeText={heroBadgeText}
					title={
						<div className=" font-bold text-balance text-3xl sm:text-4xl md:text-5xl text-center">
							{heroTitle} <br className="hidden md:block" />
							<span className="bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">
								{heroTitleGradient}
							</span>
						</div>
					}
					description={heroDescription}
					className="min-h-screen text-center"
				>
					<GlobalsClient {...props} searchEnabled={searchEnabled} defaultView={defaultView} />
				</Hero>
			) : (
				<div className="min-h-screen pt-24">
					<GlobalsClient {...props} searchEnabled={searchEnabled} defaultView={defaultView} />
				</div>
			)}
		</FilterProvider>
	);
}

export type { ListingProps };
