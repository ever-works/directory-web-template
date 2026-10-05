export const revalidate = 600;
export const dynamicParams = true;

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { surveyService } from '@/lib/services/survey.service';
import { SurveyPageClient } from '@/components/surveys/pages/public-survey-page';
import { Container } from '@/components/ui/container';
import { cache } from 'react';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { generateHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { isSurveyOfItem, surveyCanonicalPath } from '@/lib/seo/survey-urls';
import { getSurveysEnabled } from '@/lib/utils/settings';
import type { Locale } from '@/lib/constants';

interface ItemSurveyPageProps {
	params: Promise<{
		locale: string;
		slug: string;
		surveySlug: string;
	}>;
}

// Public origin: NEXT_PUBLIC_CANONICAL_URL when pinned (and valid), else the
// app URL. getBaseUrl() validates both, so a malformed pin cannot make
// `new URL(appUrl)` below throw.
const appUrl = getBaseUrl();

const getSurvey = cache((slug: string) => surveyService.getBySlug(slug));

export async function generateMetadata({ params }: ItemSurveyPageProps): Promise<Metadata> {
	// Surveys switched off: the page below 404s.
	if (!getSurveysEnabled()) {
		notFound();
	}

	const { surveySlug, slug, locale } = await params;
	const survey = await getSurvey(surveySlug);

	if (!survey) {
		return {
			metadataBase: new URL(appUrl),
			title: 'Survey Not Found'
		};
	}

	// Only the item the survey belongs to serves it (the page below does the
	// same); any other item string is not-found, not another canonical copy.
	if (!isSurveyOfItem(survey, slug)) {
		notFound();
	}

	return {
		metadataBase: new URL(appUrl),
		title: `${survey.title} | Survey`,
		description: survey.description || `Take the ${survey.title} survey`,
		// Own canonical instead of the [locale] layout's homepage canonical.
		alternates: {
			canonical: getLocalizedUrl(surveyCanonicalPath(survey), locale as Locale),
			// Next replaces `alternates` whole: a canonical alone dropped the
			// layout's hreflang. The cluster of the canonical page, as on /surveys.
			languages: generateHreflangAlternates(surveyCanonicalPath(survey))
		}
	};
}

export default async function ItemSurveyPage({ params }: ItemSurveyPageProps) {
	if (!getSurveysEnabled()) {
		notFound();
	}

	const { surveySlug, slug } = await params;

	// Fetch survey data on the server
	const survey = await getSurvey(surveySlug);

	// Unknown survey, or a survey that does not belong to this item → 404.
	if (!survey || !isSurveyOfItem(survey, slug)) {
		notFound();
	}

	// Pass the item slug for context
	return (
		<Container className="my-8" maxWidth="7xl" padding="default" useGlobalWidth>
			<SurveyPageClient survey={survey} itemSlug={slug} />
		</Container>
	);
}

