export const revalidate = 600;

import { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { surveyService } from '@/lib/services/survey.service';
import { getStatusColor, getTypeColor } from '@/components/surveys/utils/survey-helpers';
import { Container } from '@/components/ui/container';
import { Survey } from '@/lib/db/schema';
import { Logger } from '@/lib/logger';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';
import { getSurveysEnabled } from '@/lib/utils/settings';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { getLocalizedUrl } from '@/lib/seo/hreflang';
import { getSiteName } from '@/lib/seo/site-identity';
import type { Locale } from '@/lib/constants';

const logger = Logger.create('SurveysPage');

// Public origin: NEXT_PUBLIC_CANONICAL_URL when pinned (and valid), else the
// app URL. getBaseUrl() validates both, so a malformed pin cannot make
// `new URL(appUrl)` below throw.
const appUrl = getBaseUrl();

export async function generateMetadata({
    params
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    // Surveys switched off: the page below 404s.
    if (!getSurveysEnabled()) {
        notFound();
    }

    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'survey' });
    const siteName = await getSiteName();
    // The configured site name, as every listing title has it: the
    // `survey.PAGE_TITLE` message spells the template's own brand
    // ("Surveys | Ever Works") into every directory built from it.
    const title = `${t('SURVEYS')} | ${siteName}`;
    const description = t('PAGE_META_DESCRIPTION');
    const canonical = getLocalizedUrl('/surveys', locale as Locale);

    return {
        metadataBase: new URL(appUrl),
        title,
        description,
        // Own og:url (Next replaces, never merges, `openGraph`), so a share
        // names this page rather than none.
        openGraph: {
            title,
            description,
            type: 'website',
            siteName,
            url: canonical
        },
        // Own canonical: without it this page inherited the [locale] layout's
        // `alternates` and declared itself a duplicate of the homepage.
        // Canonical only - survey content is not translated per locale.
        alternates: {
            canonical
        }
    };
}

export default async function SurveysPage() {
    const t = await getTranslations('survey');
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
                    <h1 className="text-3xl font-bold mb-2">{t('SURVEYS')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('PAGE_DESCRIPTION')}</p>
                </div>

                {publishedSurveys.length === 0 ? (
                    <div className="text-center py-16">
                    <p className="text-gray-500 dark:text-gray-400">{t('NO_SURVEYS_AVAILABLE')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {publishedSurveys.map((survey) => (
                            <Link
                                key={survey.id}
                                href={`/surveys/${survey.slug}`}
                                className="block bg-white dark:bg-white/5 rounded-lg shadow-xs hover:shadow-md transition-shadow p-6 border border-gray-200 dark:border-white/6"
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

                                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">{t('TAKE_SURVEY')} →</div>
                            </Link>
                        ))}
                    </div>
                )}
            </Container>
        </div>
    );
}
