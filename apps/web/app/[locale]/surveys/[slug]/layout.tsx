import { Metadata } from 'next';
import { surveyService } from '@/lib/services/survey.service';
import { Container } from '@/components/ui/container';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { generateHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { surveyCanonicalPath } from '@/lib/seo/survey-urls';
import { getSurveysEnabled } from '@/lib/utils/settings';
import type { Locale } from '@/lib/constants';

interface SurveyLayoutProps {
	params: Promise<{
		locale: string;
		slug: string;
	}>;
}

const getSurvey = cache(async (slug: string) => {
	return surveyService.getBySlug(slug);
});

// Public origin: NEXT_PUBLIC_CANONICAL_URL when pinned (and valid), else the
// app URL. getBaseUrl() validates both, so a malformed pin cannot make
// `new URL(appUrl)` below throw.
const appUrl = getBaseUrl();

export async function generateMetadata({ params }: SurveyLayoutProps): Promise<Metadata> {
	// Surveys switched off: the layout below 404s.
	if (!getSurveysEnabled()) {
		notFound();
	}

	const { slug, locale } = await params;
	const survey = await getSurvey(slug);

	if (!survey) {
		return {
			metadataBase: new URL(appUrl),
			title: 'Survey Not Found'
		};
	}

	return {
		metadataBase: new URL(appUrl),
		title: `${survey.title} | Surveys`,
		description: survey.description || 'Complete this survey',
		// Own canonical instead of the [locale] layout's homepage canonical:
		// the survey's one public URL. /surveys/<slug> serves any survey, so an
		// item survey reached here points at its item's survey page instead.
		alternates: {
			canonical: getLocalizedUrl(surveyCanonicalPath(survey), locale as Locale),
			// Next replaces `alternates` whole: a canonical alone dropped the
			// layout's hreflang. The cluster of the canonical page, as on /surveys.
			languages: generateHreflangAlternates(surveyCanonicalPath(survey))
		}
	};
}

export default async function SurveyLayout({
	children,
	params,
}: { children: React.ReactNode; params: SurveyLayoutProps['params'] }) {
	if (!getSurveysEnabled()) {
		notFound();
	}

	const { slug } = await params;
	const survey = await getSurvey(slug);

	if (!survey) {
		return notFound();
	}

	return (
		<div className="py-8">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				{children}
			</Container>
		</div>
	);
}