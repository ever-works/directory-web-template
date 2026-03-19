'use client';

import React, { useState } from 'react';
import type { Survey, SurveyResponse } from '@/lib/db/schema';
import { Modal } from '@/components/ui/modal';
import { SurveyFormNoSSR } from '../forms/survey-form-no-ssr';
import { formatDateTime } from '@/utils/date';
import { useTranslations, useLocale } from 'next-intl';

interface ResponseDetailDialogProps {
    survey: Survey;
    response: SurveyResponse;
    isOpen: boolean;
    onClose: () => void;
}

export function ResponseDetailDialog({
    survey,
    response,
    isOpen,
    onClose
}: ResponseDetailDialogProps) {
    const t = useTranslations('survey');
    const tCommon = useTranslations('common');
    const locale = useLocale();
    const [showAllOnOnePage, setShowAllOnOnePage] = useState(false);

    // Create a read-only version of the survey JSON
    const readOnlySurveyJson = {
        ...(survey.surveyJson && typeof survey.surveyJson === 'object' && !Array.isArray(survey.surveyJson) ? survey.surveyJson : {}),
        mode: 'display', // Set to display mode (read-only)
        showCompletedPage: false,
        questionsOnPageMode: showAllOnOnePage ? 'singlePage' : 'standard' // Toggle view mode
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            className="max-w-4xl max-h-[90vh] flex flex-col"
            title={`${survey.title} - ${t('RESPONSE_DETAILS')}`}
            subtitle={
                <div className="flex items-start justify-between w-full">
                    <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                             {t('RESPONSE_ID')}: {response.id}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                             {t('RESPONSE_SUBMITTED')}: {response.completedAt ? formatDateTime(response.completedAt, locale) : '—'}
                        </p>
                        {response.userId && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                 {tCommon('USER')}: {response.userId}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        <input
                            type="checkbox"
                            id="show-all-toggle"
                            checked={showAllOnOnePage}
                            onChange={(e) => setShowAllOnOnePage(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label
                            htmlFor="show-all-toggle"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap"
                        >
                             {t('SHOW_ALL_QUESTIONS_ONE_PAGE')}
                        </label>
                    </div>
                </div>
            }
        >
            <SurveyFormNoSSR
                surveyJson={readOnlySurveyJson}
                data={response.data}
                onComplete={() => {
                    // Read-only mode - no action needed
                }}
                className="survey-response-detail"
            />
        </Modal>
    );
}

