import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SponsorshipsContent } from './sponsorships-content';
import { getSponsorAdPricingConfig } from '@/lib/utils/settings';
import { getLocale } from 'next-intl/server';

// Force dynamic rendering to always get fresh pricing config
export const dynamic = 'force-dynamic';

export default async function SponsorshipsPage() {
	const locale = await getLocale();
	const session = await auth();

	// Check if user is authenticated
	if (!session?.user) {
		redirect(`/${locale}/auth/signin`);
	}

	// Get current pricing configuration
	const pricingConfig = getSponsorAdPricingConfig();

	return <SponsorshipsContent pricingConfig={pricingConfig} />;
}
