export const revalidate = 600;
export const dynamicParams = true;

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { surveyService } from '@/lib/services/survey.service';
import { SurveyPageClient } from '@/components/surveys/pages/public-survey-page';
import { Container } from '@/components/ui/container';
import { cache } from 'react';
import { cleanUrl } from '@/lib/utils/url-cleaner';

interface ItemSurveyPageProps {
	params: Promise<{
		locale: string;
		slug: string;
		surveySlug: string;
	}>;
}

const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");
const appUrl = cleanUrl(rawUrl);

const getSurvey = cache((slug: string) => surveyService.getBySlug(slug));

export async function generateMetadata({ params }: ItemSurveyPageProps): Promise<Metadata> {
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
		title: `${survey.title} | Survey`,
		description: survey.description || `Take the ${survey.title} survey`
	};
}

export default async function ItemSurveyPage({ params }: ItemSurveyPageProps) {
	const { surveySlug, slug } = await params;

	// Fetch survey data on the server
	const survey = await getSurvey(surveySlug);

	if (!survey) {
		notFound();
	}

	// Pass the item slug for context
	return (
		<Container className="my-8" maxWidth="7xl" padding="default" useGlobalWidth>
			<SurveyPageClient survey={survey} itemSlug={slug} />
		</Container>
	);
}

