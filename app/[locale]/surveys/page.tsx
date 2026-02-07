export const revalidate = 600;

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { surveyService } from '@/lib/services/survey.service';
import { getStatusColor, getTypeColor } from '@/components/surveys/utils/survey-helpers';
import { Container } from '@/components/ui/container';
import { Survey } from '@/lib/db/schema';
import { Logger } from '@/lib/logger';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';
import { getSurveysEnabled } from '@/lib/utils/settings';
import { cleanUrl } from '@/lib/utils/url-cleaner';

const logger = Logger.create('SurveysPage');

const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");
const appUrl = cleanUrl(rawUrl);

export const metadata: Metadata = {
    metadataBase: new URL(appUrl),
    title: 'Surveys | Ever Works',
    description: 'Browse and complete surveys'
};

export default async function SurveysPage() {
    // Redirect to 404 if surveys are disabled
    const surveysEnabled = getSurveysEnabled();
    if (!surveysEnabled) {
        notFound();
    }

    let publishedSurveys: Survey[] = [];

    try {
        const result = await surveyService.getMany({
            type: SurveyTypeEnum.GLOBAL,
            status: SurveyStatusEnum.PUBLISHED
        });
        publishedSurveys = result.surveys || [];
    } catch (error) {
        logger.error('Error fetching surveys:', error);
        publishedSurveys = [];
    }

    return (
        <div className="py-8">
            <Container maxWidth="7xl" padding="default" useGlobalWidth>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Surveys</h1>
                    <p className="text-gray-600 dark:text-gray-400">Help us improve by sharing your feedback</p>
                </div>

                {publishedSurveys.length === 0 ? (
                    <div className="text-center py-16">
                    <p className="text-gray-500 dark:text-gray-400">No surveys available at this time.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {publishedSurveys.map((survey) => (
                            <Link
                                key={survey.id}
                                href={`/surveys/${survey.slug}`}
                                className="block bg-white dark:bg-gray-800 rounded-lg shadow-xs hover:shadow-md transition-shadow p-6 border border-gray-200 dark:border-gray-700"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <h2 className="text-xl font-semibold flex-1">{survey.title}</h2>
                                    <span className={`px-2 py-1 rounded-sm text-xs font-medium ${getTypeColor(survey.type)}`}>
                                        {survey.type}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    <span className={`px-2 py-1 rounded-sm text-xs font-medium ${getStatusColor(survey.status)}`}>
                                        {survey.status}
                                    </span>
                                </div>

                                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Take Survey →</div>
                            </Link>
                        ))}
                    </div>
                )}
            </Container>
        </div>
    );
}

