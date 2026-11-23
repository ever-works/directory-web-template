import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { surveyService } from '@/lib/services/survey.service';
import { requireAdmin } from '@/lib/auth/guards';
import { SurveyResponsesClient } from '@/components/surveys/responses/survey-responses-client';
import { getSurveysEnabled } from '@/lib/utils/settings';
import { cleanUrl } from '@/lib/utils/url-cleaner';

interface AdminSurveyResponsesPageProps {
	params: Promise<{
		locale: string;
		slug: string;
	}>;
}

const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://dir.ever.works");
const appUrl = cleanUrl(rawUrl);

// Cached fetch to prevent duplicate queries
const getSurvey = cache(async (slug: string) => {
	return surveyService.getBySlug(slug);
});

// Admin check on the server, before the survey is read (the admin layout checks in the browser, after the
// survey is already in the page payload). Signed out goes to sign-in, no live admin role to /unauthorized.
// Cached so generateMetadata and the page share one check per request.
const requireAdminOnce = cache(requireAdmin);

export async function generateMetadata({ params }: AdminSurveyResponsesPageProps): Promise<Metadata> {
	await requireAdminOnce();
	const { slug } = await params;
	const survey = await getSurvey(slug);

	if (!survey) {
		return {
			metadataBase: new URL(appUrl),
			title: 'Survey Not Found'
		};
	}

	return {
		metadataBase: new URL(appUrl),
		title: `${survey.title} - Responses | Admin`,
		description: `View responses for ${survey.title}`
	};
}

export default async function AdminSurveyResponsesPage({ params }: AdminSurveyResponsesPageProps) {
	await requireAdminOnce();
	const { slug } = await params;
	const survey = await getSurvey(slug);
	const surveysEnabled = getSurveysEnabled();

	if (!survey) {
		notFound();
	}

	return (
		<SurveyResponsesClient
			survey={survey}
			backLink={{
				href: '/admin/surveys',
				label: 'Back to Surveys'
			}}
			surveysEnabled={surveysEnabled}
		/>
	);
}

