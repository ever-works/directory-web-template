export const revalidate = 600;
export const dynamicParams = true;

import { SurveyPageClient } from '@/components/surveys/pages/public-survey-page';
import { surveyService } from '@/lib/services/survey.service';
import { notFound } from 'next/navigation';
import { cache } from 'react';

interface SurveyPageProps {
	params: Promise<{
		locale: string;
		slug: string;
	}>;
}

const getSurvey = cache((slug: string) => surveyService.getBySlug(slug));

export default async function SurveyPage({ params }: SurveyPageProps) {
	const { slug } = await params;

	// Fetch survey data on the server
	const survey = await getSurvey(slug);

	if (!survey) {
		notFound();
	}

	return <SurveyPageClient survey={survey} />;
}

