import { PricingSection } from '@/components/pricing/pricing-section';
import { Container } from '@/components/ui/container';
import { cn } from '@/lib/utils';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { siteConfig } from '@/lib/config';
import { Locale } from '@/lib/constants';

// Enable ISR with 1 hour revalidation for pricing page
export const revalidate = 3600;

export async function generateMetadata({
	params
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'pricing' });

	const path = '/pricing';
	const title = `${t('CHOOSE_YOUR_PERFECT_PLAN')} | ${siteConfig.name}`;
	const description = t('DESCRIPTION');

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: 'website',
			url: getLocalizedUrl(path, locale as Locale),
			siteName: siteConfig.name
		},
		alternates: {
			canonical: getLocalizedUrl(path, locale as Locale),
			languages: generateHreflangAlternates(path)
		}
	};
}


export default function PricingPage() {
	return (
		<div
			className={cn(
				'w-full min-h-screen bg-white dark:bg-[#0b111f]'
			)}
		>
			<Container maxWidth="7xl" padding="default" useGlobalWidth className="py-12">
				<PricingSection />
			</Container>

		</div>
	);
}
