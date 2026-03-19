'use client';

import React, { useState, useEffect } from 'react';
import type { Survey } from '@/lib/db/schema';
import { toast } from 'sonner';
import { ItemSelector } from './item-selector';
import { Eye, Download } from 'lucide-react';
import { ImportSurveyJsDialog } from './import-surveyjs-dialog';
import { SurveyPreviewDialog } from './survey-preview-dialog';
import { Button } from '@/components/ui/button';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';
import { useTranslations } from 'next-intl';

interface SurveyFormProps {
	survey?: Survey;
	onSubmit: (data: SurveyFormData) => Promise<void>;
	onCancel: () => void;
	isLoading?: boolean;
	mode: 'create' | 'edit';
	defaultType?: SurveyTypeEnum;
	defaultItemId?: string;
}

export interface SurveyFormData {
	title: string;
	description?: string;
	type: SurveyTypeEnum;
	itemId?: string;
	status: SurveyStatusEnum;
	surveyJson: any;
}

export function AdminSurveyForm({ survey, onSubmit, onCancel, isLoading, mode, defaultType, defaultItemId }: SurveyFormProps) {
	const t = useTranslations('survey');
	const tCommon = useTranslations('common');
	const [formData, setFormData] = useState<SurveyFormData>({
		title: survey?.title || '',
		description: survey?.description || '',
		type: (survey?.type || defaultType || SurveyTypeEnum.GLOBAL) as SurveyTypeEnum,
		itemId: survey?.itemId || defaultItemId || '',
		status: (survey?.status || SurveyStatusEnum.DRAFT) as SurveyStatusEnum,
		surveyJson: survey?.surveyJson || {
			title: '',
			pages: [
				{
					name: 'page1',
					elements: []
				}
			]
		}
	});

	const [jsonInput, setJsonInput] = useState(
		JSON.stringify(formData.surveyJson, null, 2)
	);
	const [jsonError, setJsonError] = useState('');
	const [showPreview, setShowPreview] = useState(false);
	const [previewJson, setPreviewJson] = useState(formData.surveyJson);
	const [showImportDialog, setShowImportDialog] = useState(false);

	useEffect(() => {
		if (survey) {
			setFormData({
				title: survey.title,
				description: survey.description || '',
				type: survey.type as SurveyTypeEnum,
				itemId: survey.itemId || '',
				status: survey.status as SurveyStatusEnum,
				surveyJson: survey.surveyJson
			});
			setJsonInput(JSON.stringify(survey.surveyJson, null, 2));
		}
	}, [survey]);

	const handleJsonChange = (value: string) => {
		setJsonInput(value);
		setJsonError('');

		try {
			const parsed = JSON.parse(value);
			setFormData(prev => ({ ...prev, surveyJson: parsed }));
			setPreviewJson(parsed); // Update preview
		} catch {
			setJsonError(tCommon('INVALID_JSON_FORMAT'));
		}
	};

	const handleFormatJson = () => {
		try {
			const parsed = JSON.parse(jsonInput);
			const formatted = JSON.stringify(parsed, null, 2);
			setJsonInput(formatted);
			setJsonError('');
		} catch {
			// Silent error
		}
	};

	const handleMinifyJson = () => {
		try {
			const parsed = JSON.parse(jsonInput);
			const minified = JSON.stringify(parsed);
			setJsonInput(minified);
			setJsonError('');
		} catch {
			// Silent error
		}
	};

	const handlePreview = () => {
		if (jsonError) {
			toast.error(t('FIX_JSON_ERRORS_PREVIEW'));
			return;
		}
		setShowPreview(true);
	};

	const handleImportSurvey = (surveyJson: any) => {
		setFormData(prev => ({ ...prev, surveyJson }));
		setJsonInput(JSON.stringify(surveyJson, null, 2));
		setPreviewJson(surveyJson);
		setJsonError('');
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.title.trim()) {
			toast.error(t('TITLE_REQUIRED'));
			return;
		}

		if (jsonError) {
			toast.error(t('FIX_JSON_ERRORS'));
			return;
		}

		if (formData.type === SurveyTypeEnum.ITEM && !formData.itemId) {
			toast.error(t('ITEM_ID_REQUIRED'));
			return;
		}

		try {
			await onSubmit(formData);
		} catch (err) {
			console.error(err);
			toast.error(t('FAILED_TO_CREATE_SURVEY'));
		}
	};

	return (
		<form onSubmit={handleSubmit} className="p-6 space-y-6">
			{/* Title */}
			<div>
				<label htmlFor="survey-title" className="block text-sm font-medium mb-2">
					{tCommon('TITLE')} <span className="text-red-500">*</span>
				</label>
				<input
					id="survey-title"
					type="text"
					value={formData.title}
					onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
					className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					placeholder={t('ENTER_SURVEY_TITLE')}
					disabled={isLoading}
					required
				/>
			</div>

			{/* Description */}
			<div>
				<label htmlFor="survey-description" className="block text-sm font-medium mb-2">
					{tCommon('DESCRIPTION')}
				</label>
				<textarea
					id="survey-description"
					value={formData.description}
					onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
					className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
					rows={3}
					placeholder={t('ENTER_SURVEY_DESCRIPTION')}
					disabled={isLoading}
				/>
			</div>

			{/* Type and Status Row */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Type */}
				<div>
					<label htmlFor="survey-type" className="block text-sm font-medium mb-2">
						{t('SURVEY_TYPE')} <span className="text-red-500">*</span>
					</label>
					<select
						id="survey-type"
						value={formData.type}
						onChange={(e) => {
							const newType = e.target.value as SurveyTypeEnum;
							setFormData(prev => ({
								...prev,
								type: newType,
								itemId: newType === SurveyTypeEnum.GLOBAL ? '' : prev.itemId
							}));
						}}
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						disabled={isLoading || mode === 'edit'}
					>
						<option value={SurveyTypeEnum.GLOBAL}>{t('GLOBAL_SURVEY')}</option>
						<option value={SurveyTypeEnum.ITEM}>{t('ITEM_SURVEY')}</option>
					</select>
					{mode === 'edit' && (
						<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{t('SURVEY_TYPE_CANNOT_BE_CHANGED')}
						</p>
					)}
				</div>

				{/* Status */}
				<div>
					<label htmlFor="survey-status" className="block text-sm font-medium mb-2">
						{t('STATUS')} <span className="text-red-500">*</span>
					</label>
					<select
						id="survey-status"
						value={formData.status}
						onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as SurveyStatusEnum }))}
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						disabled={isLoading}
					>
						<option value={SurveyStatusEnum.DRAFT}> {tCommon('DRAFT')}</option>
						<option value={SurveyStatusEnum.PUBLISHED}> {tCommon('PUBLISHED')}</option>
						<option value={SurveyStatusEnum.CLOSED}> {tCommon('CLOSED')}</option>
					</select>
				</div>
			</div>

			{/* Item Selector - Only show when type is 'item' */}
			{formData.type === SurveyTypeEnum.ITEM && (
				<ItemSelector
					selectedItemId={formData.itemId}
					onItemSelect={(itemId) => setFormData(prev => ({ ...prev, itemId }))}
					disabled={isLoading}
					required
					label={tCommon('SELECT_ITEM')}
					placeholder={t('CHOOSE_ITEM_FOR_SURVEY')}
				/>
			)}


			{/* Survey JSON */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<label htmlFor="survey-json" className="block text-sm font-medium">
						{t('SURVEY_DEFINITION_JSON')} <span className="text-red-500">*</span>
					</label>
				</div>

				<div className="flex items-center gap-2 mb-2">
					<Button
						type="button"
						variant="outline"
						onClick={handleFormatJson}
						size="xs"
						disabled={isLoading}
					>
						{tCommon('FORMAT_JSON')}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={handleMinifyJson}
						size="xs"
						disabled={isLoading}
					>
						{tCommon('MINIFY_JSON')}
					</Button>
					<Button
						type="button"
						onClick={() => setShowImportDialog(true)}
						size="xs"
						disabled={isLoading}
					>
						<Download className="w-3 h-3 mr-1" />
						{t('IMPORT_FROM_SURVEYJS')}
					</Button>
					<Button
						type="button"
						onClick={handlePreview}
						size="xs"
						disabled={isLoading || !!jsonError}
					>
						<Eye className="w-3 h-3 mr-1" />
						{t('PREVIEW_SURVEY')}
					</Button>
				</div>

				<textarea
					id="survey-json"
					value={jsonInput}
					onChange={(e) => handleJsonChange(e.target.value)}
					className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm ${jsonError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
						}`}
					rows={12}
					placeholder='{"title": "My Survey", "pages": [...]}'
					disabled={isLoading}
					required
					aria-invalid={!!jsonError}
					aria-describedby={jsonError ? 'survey-json-error' : undefined}
				/>
				{jsonError && (
					<p id="survey-json-error" className="mt-1 text-sm text-red-500">{jsonError}</p>
				)}

				<div className="mb-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
					<p className="text-sm font-medium text-blue-900 dark:text-blue-100">
						How to create your survey JSON:
					</p>
					<div className="space-y-3">
						<div>
							<p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Option 1: Import from SurveyJS (Recommended)</p>
							<ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside ml-2">
								<li>Click &quot;Import from SurveyJS&quot; button above</li>
								<li>Enter your SurveyJS survey ID</li>
							</ol>
						</div>
						<div>
							<p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Option 2: Manual Copy/Paste</p>
							<ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside ml-2">
								<li>
									Visit <a href="https://surveyjs.io/create-free-survey" target="_blank" rel="noopener noreferrer" className="underline font-medium">SurveyJS Creator</a>
								</li>
								<li>Design your survey using the drag-and-drop interface</li>
								<li>Click the &quot;JSON Editor&quot; tab at the top</li>
								<li>Copy the entire JSON and paste it here</li>
							</ol>
						</div>
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isLoading}
				>
					{tCommon('CANCEL')}
				</Button>
				<Button
					type="submit"
					disabled={isLoading || !!jsonError}
				>
					{isLoading ? tCommon('SAVING') : mode === 'create' ? t('CREATE_SURVEY_BTN') : t('UPDATE_SURVEY_BTN')}
				</Button>
			</div>

			{/* Preview Dialog */}
			<SurveyPreviewDialog
				surveyJson={previewJson}
				title={t('SURVEY_PREVIEW')}
				isOpen={showPreview}
				onClose={() => setShowPreview(false)}
			/>

			{/* Import from SurveyJS Dialog */}
			<ImportSurveyJsDialog
				isOpen={showImportDialog}
				onClose={() => setShowImportDialog(false)}
				onImport={handleImportSurvey}
			/>
		</form>
	);
}

