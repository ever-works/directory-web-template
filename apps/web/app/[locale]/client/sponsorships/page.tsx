import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SponsorshipsContent } from './sponsorships-content';
import { getSponsorAdPricingConfig } from '@/lib/utils/settings';
import { getLocale } from 'next-intl/server';

// Force dynamic rendering to always get fresh pricing config
export const dynamic = 'force-dynamic';
// Force Node.js runtime so auth()'s DB/bcryptjs-backed JWT callbacks can run.
// Otherwise Vercel may run this page on the Edge runtime, where the
// `postgres` / `bcryptjs` / `drizzle-orm` server externals can't load and
// auth() silently returns null even with a valid session cookie attached.
// Spec 027.
export const runtime = 'nodejs';

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
