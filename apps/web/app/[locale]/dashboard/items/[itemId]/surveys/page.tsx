import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DashboardItemSurveysClient } from '@/components/surveys/lists/item-surveys-list';
import { getSurveysEnabled } from '@/lib/utils/settings';
import { checkIsAdmin } from '@/lib/auth/guards';
import { cleanUrl } from '@/lib/utils/url-cleaner';

interface DashboardItemSurveysPageProps {
	params: Promise<{
		locale: string;
		itemId: string;
	}>;
}

const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");
const appUrl = cleanUrl(rawUrl);

export function generateMetadata(): Metadata {	
	return {
		metadataBase: new URL(appUrl),
		title: `Item Surveys | Dashboard`,
		description: 'Manage surveys for your listing'
	};
}

export default async function DashboardItemSurveysPage({ params }: DashboardItemSurveysPageProps) {
	const surveysEnabled = getSurveysEnabled();
	const isAdmin = await checkIsAdmin();

	// Redirect to 404 if surveys are disabled and user is not admin
	if (!surveysEnabled && !isAdmin) {
		notFound();
	}

	const { itemId } = await params;

	return <DashboardItemSurveysClient itemId={itemId} surveysEnabled={surveysEnabled} />;
}
