'use client';

import React from 'react';
import 'survey-core/survey-core.min.css';
import { SurveyFormProps } from './survey-form';
import dynamic from 'next/dynamic';
import { InlineLoading } from '@/components/ui/loading-spinner';

const SurveyForm = dynamic(() => import('./survey-form').then((mod) => mod.SurveyForm), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center min-h-[400px]">	
			<InlineLoading text="Loading survey..." />
		</div>
	)
});

type SurveyFormNoSSRProps = SurveyFormProps;

export function SurveyFormNoSSR(props: SurveyFormNoSSRProps) {
	return <SurveyForm {...props}></SurveyForm>;
}
