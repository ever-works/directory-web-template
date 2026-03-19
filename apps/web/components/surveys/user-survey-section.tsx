'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { surveyApiClient } from '@/lib/api/survey-api.client';
import type { SurveyItem } from '@/lib/db/schema';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDateTime } from '@/utils/date';
import { SurveyStatusEnum } from '@/lib/types/survey';
import { ItemDetailProps } from '../item-detail';
import { SurveyDialog } from './survey-dialog';
import { Logger } from '@/lib/logger';

const logger = Logger.create('UserSurveySection');

interface UserSurveySectionProps {
  item: ItemDetailProps['meta'];
}

export function UserSurveySection({ item }: UserSurveySectionProps) {
  const t = useTranslations('survey');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug]);

  const loadSurveys = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await surveyApiClient.getMany({
        itemId: item.slug || '',
        status: SurveyStatusEnum.PUBLISHED
      });
      setSurveys(result.surveys);
    } catch (err) {
      logger.error('Error loading surveys', err);
      setError('Error loading surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleSurveySubmitted = () => {
    // Reload surveys to get updated completion status
    loadSurveys();
    toast.success(t('SURVEY_SUBMITTED_SUCCESSFULLY'));
  };

  const handleOpenSurveyDialog = (survey: SurveyItem) => {
    setSelectedSurvey(survey);
    setDialogOpen(true);
  };

  const handleDialogCompleted = () => {
    handleSurveySubmitted();
  };

  const getStatusBadge = (survey: SurveyItem) => {
    if (survey.isCompletedByUser) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          {tCommon('COMPLETED')}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="border-blue-200 text-blue-800 dark:border-blue-800 dark:text-blue-200">
        <Clock className="w-3 h-3 mr-1" />
        {tCommon('AVAILABLE')}
      </Badge>
    );
  };

  // Don't show section if no surveys (hide immediately after loading completes)
  // This check happens after loading to avoid showing loading state when there are no surveys
  if (!loading && surveys.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('SURVEYS')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{tCommon('LOADING')}...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // If there's an error but no surveys, don't show error state (hide the section)
    if (surveys.length === 0) {
      return null;
    }
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('SURVEYS')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <Button
              variant="outline"
              onClick={loadSurveys}
              className="mt-4"
            >
              {tCommon('RETRY')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safety check: don't show section if no surveys
  if (surveys.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('SURVEYS_FOR_ITEM', { itemName: item.name })}
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('MULTIPLE_SURVEYS_DESC')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {survey.title}
                    </h3>
                    {survey.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {survey.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4">
                      {getStatusBadge(survey)}
                      {survey.publishedAt && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {tCommon('PUBLISHED_AT')}: {formatDateTime(survey.publishedAt, locale)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  {survey.isCompletedByUser ? (
                    <>
                      <Button
                        onClick={() => handleOpenSurveyDialog(survey)}
                        variant="outline"
                        className="border-green-600 text-green-700 dark:border-green-500 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t('RETAKE_SURVEY')}
                      </Button>
                      <Link href={`/items/${item.slug}/surveys/${survey.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="gap-2">
                          <ExternalLink className="w-4 h-4" />
                          {tCommon('OPEN_IN_NEW_TAB')}
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleOpenSurveyDialog(survey)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {t('TAKE_SURVEY')}
                      </Button>
                      <Link href={`/items/${item.slug}/surveys/${survey.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="gap-2">
                          <ExternalLink className="w-4 h-4" />
                          {tCommon('OPEN_IN_NEW_TAB')}
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Survey Dialog */}
      <SurveyDialog
        survey={selectedSurvey}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        itemSlug={item.slug || ''}
        onCompleted={handleDialogCompleted}
      />
    </>
  );
}
