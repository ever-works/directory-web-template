import { Metadata } from 'next';
import { surveyService } from '@/lib/services/survey.service';
import { Container } from '@/components/ui/container';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { cleanUrl } from '@/lib/utils/url-cleaner';

interface SurveyLayoutProps {
	params: Promise<{
		locale: string;
		slug: string;
	}>;
}

const getSurvey = cache(async (slug: string) => {
	return surveyService.getBySlug(slug);
});

const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");
const appUrl = cleanUrl(rawUrl);

export async function generateMetadata({ params }: SurveyLayoutProps): Promise<Metadata> {
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
		title: `${survey.title} | Surveys`,
		description: survey.description || 'Complete this survey'
	};
}

export default async function SurveyLayout({
	children,
	params,
}: { children: React.ReactNode; params: SurveyLayoutProps['params'] }) {
	
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