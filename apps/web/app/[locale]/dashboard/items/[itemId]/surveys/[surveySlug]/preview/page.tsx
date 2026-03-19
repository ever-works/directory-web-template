import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { surveyService } from '@/lib/services/survey.service';
import { SurveyPreviewClient } from '@/components/surveys/preview/preview-client';
import { cache } from 'react';
import { getSurveysEnabled } from '@/lib/utils/settings';
import { checkIsAdmin } from '@/lib/auth/guards';
import { cleanUrl } from '@/lib/utils/url-cleaner';

interface DashboardSurveyPreviewPageProps {
	params: Promise<{
		locale: string;
		itemId: string;
		surveySlug: string;
	}>;
}

const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");
const appUrl = cleanUrl(rawUrl);

const getSurvey = cache((slug: string) => surveyService.getBySlug(slug));

export async function generateMetadata({ params }: DashboardSurveyPreviewPageProps): Promise<Metadata> {
	const { surveySlug } = await params;
	const survey = await getSurvey(surveySlug);
	if (!survey) {
		return {
			metadataBase: new URL(appUrl),
			title: 'Survey Not Found'
		};
	}

	return {
		metadataBase: new URL(appUrl),
		title: `${survey.title} - Preview | Dashboard`,
		description: `Preview ${survey.title}`
	};
}

export default async function DashboardSurveyPreviewPage({ params }: DashboardSurveyPreviewPageProps) {
	const surveysEnabled = getSurveysEnabled();
	const isAdmin = await checkIsAdmin();

	// Redirect to 404 if surveys are disabled and user is not admin
	if (!surveysEnabled && !isAdmin) {
		notFound();
	}

	const { surveySlug, itemId } = await params;
	const survey = await getSurvey(surveySlug);

	if (!survey) {
		notFound();
	}

	return <SurveyPreviewClient survey={survey} backLink={`/dashboard/items/${itemId}/surveys`} surveysEnabled={surveysEnabled} />;
}

