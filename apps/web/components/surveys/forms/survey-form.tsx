'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.min.css';

export interface SurveyFormProps {
	surveyJson: object;
	onComplete?: (sender: Model, options: any) => void;
	onValueChanged?: (sender: Model, options: any) => void;
	onCurrentPageChanged?: (sender: Model, options: any) => void;
	className?: string;
	data?: any;
	mode?: 'edit' | 'display';
}

export type SurveyFormRef = {
	surveyModel: Model | null;
}

// Function to apply theme using SurveyJS variables
const applySurveyTheme = (survey: Model) => {
	// Get CSS variables from the document
	const root = document.documentElement;
	const computedStyle = getComputedStyle(root);
	const isDark = root.classList.contains('dark');

	// Get theme colors
	const primaryColor = computedStyle.getPropertyValue('--theme-primary').trim() || '#3b82f6';
	const backgroundColor = isDark
		? computedStyle.getPropertyValue('--dark-theme-900').trim() || '#1a1a1a'
		: computedStyle.getPropertyValue('--theme-background').trim() || '#ffffff';
	const surfaceColor = isDark
		? computedStyle.getPropertyValue('--dark-theme-800').trim() || '#2d2d2d'
		: computedStyle.getPropertyValue('--theme-surface').trim() || '#f8f9fa';
	const textColor = isDark
		? computedStyle.getPropertyValue('--dark-theme-50').trim() || '#f5f5f5'
		: '#1f2937';

	// Apply SurveyJS theme variables
	survey.applyTheme({
		cssVariables: {
			'--sjs-general-backcolor': backgroundColor,
			'--sjs-general-backcolor-dim': surfaceColor,
			'--sjs-general-forecolor': textColor,
			'--sjs-primary-backcolor': primaryColor,
			'--sjs-primary-forecolor': '#ffffff',
			'--sjs-general-dim-forecolor': isDark ? '#9ca3af' : '#6b7280',
			'--sjs-border-default': isDark ? '#4a4a4a' : '#e5e7eb',
		}
	});
};

export const SurveyForm = forwardRef<SurveyFormRef, SurveyFormProps>(({
	surveyJson,
	onComplete,
	onValueChanged,
	onCurrentPageChanged,
	className = '',
	data,
	mode = 'edit',
}, ref) => {
	const [surveyModel, setSurveyModel] = useState<Model | null>(null);

	useImperativeHandle(ref, () => ({
		surveyModel,
	}));

	useEffect(() => {
		const survey = new Model(surveyJson);
		applySurveyTheme(survey);
		survey.showTitle = true;
		survey.showPageTitles = true;
		survey.questionTitleLocation = 'top';
		survey.questionErrorLocation = 'bottom';
		survey.widthMode = 'responsive';

		// Configure based on mode
		if (mode === 'display') {
			// Display mode: read-only, no interactions
			survey.mode = 'display';
			survey.showNavigationButtons = false;
			survey.showCompletedPage = false;
		} else {
			// Edit mode: normal interactive survey
			survey.showNavigationButtons = true;
			survey.showNavigationButtonsLocation = 'bottom';
			survey.showPrevButton = true;
		}

		setSurveyModel(survey);
		return () => {
			survey.clear();
			setSurveyModel(null);
		};
	}, [surveyJson, mode]);

	useEffect(() => {
		if (surveyModel && data != null) {
			surveyModel.data = data;
		}
	}, [data, surveyModel]);



	useEffect(() => {
		if (!surveyModel) return;

		// Skip event handlers in display mode
		if (mode === 'display') return;

		const hComplete = onComplete ? ((s: Model, o: any) => onComplete(s, o)) : null;
		const hValue = onValueChanged ? ((s: Model, o: any) => onValueChanged(s, o)) : null;
		const hPage = onCurrentPageChanged ? ((s: Model, o: any) => onCurrentPageChanged(s, o)) : null;
		if (hComplete) surveyModel.onComplete.add(hComplete);
		if (hValue) surveyModel.onValueChanged.add(hValue);
		if (hPage) surveyModel.onCurrentPageChanged.add(hPage);
		return () => {
			if (hComplete) surveyModel.onComplete.remove(hComplete);
			if (hValue) surveyModel.onValueChanged.remove(hValue);
			if (hPage) surveyModel.onCurrentPageChanged.remove(hPage);
		};
	}, [onComplete, onValueChanged, onCurrentPageChanged, surveyModel, mode]);

	if (!surveyModel) {
		return null;
	}

	return (
		<>
			<div className={className}>
				<Survey model={surveyModel} />
			</div>
		</>
	);
})


SurveyForm.displayName = 'SurveyForm';

export default SurveyForm;