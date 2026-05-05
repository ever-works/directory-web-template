'use client';

import React, { useState, useEffect } from 'react';
import type { Survey } from '@/lib/db/schema';
import { toast } from 'sonner';
import { ItemSelector } from './item-selector';
import { Eye, Download, Braces, Minimize2, Loader2, Save, X, Info, ChevronDown } from 'lucide-react';
import { ImportSurveyJsDialog } from './import-surveyjs-dialog';
import { SurveyPreviewDialog } from './survey-preview-dialog';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

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

const INPUT_BASE = cn(
	'w-full px-3 text-sm rounded-xl',
	'bg-white dark:bg-white/3',
	'border border-gray-200 dark:border-white/8',
	'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
	'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
	'transition-all duration-150',
	'disabled:opacity-50 disabled:cursor-not-allowed'
);

function Field({
	label,
	required,
	hint,
	error,
	children,
}: {
	label: string;
	required?: boolean;
	hint?: string;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
				{label}
				{required && <span className="ml-0.5 text-red-500">*</span>}
			</label>
			{children}
			{error && (
				<p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
					<span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
					{error}
				</p>
			)}
			{!error && hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
		</div>
	);
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
			pages: [{ name: 'page1', elements: [] }]
		}
	});

	const [jsonInput, setJsonInput] = useState(JSON.stringify(formData.surveyJson, null, 2));
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
			setPreviewJson(parsed);
		} catch {
			setJsonError(tCommon('INVALID_JSON_FORMAT'));
		}
	};

	const handleFormatJson = () => {
		try {
			setJsonInput(JSON.stringify(JSON.parse(jsonInput), null, 2));
			setJsonError('');
		} catch {
			// silent
		}
	};

	const handleMinifyJson = () => {
		try {
			setJsonInput(JSON.stringify(JSON.parse(jsonInput)));
			setJsonError('');
		} catch {
			// silent
		}
	};

	const handlePreview = () => {
		if (jsonError) { toast.error(t('FIX_JSON_ERRORS_PREVIEW')); return; }
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
		if (!formData.title.trim()) { toast.error(t('TITLE_REQUIRED')); return; }
		if (jsonError) { toast.error(t('FIX_JSON_ERRORS')); return; }
		if (formData.type === SurveyTypeEnum.ITEM && !formData.itemId) { toast.error(t('ITEM_ID_REQUIRED')); return; }
		try {
			await onSubmit(formData);
		} catch (err) {
			console.error(err);
			toast.error(t('FAILED_TO_CREATE_SURVEY'));
		}
	};

	return (
		<form onSubmit={handleSubmit} className="divide-y divide-gray-100 dark:divide-white/6">
			{/* ── Basic Info ─────────────────────────────────────────── */}
			<div className="p-5 space-y-4">
				<p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
					{tCommon('BASIC_INFO') || 'Basic Info'}
				</p>

				{/* Title */}
				<Field label={tCommon('TITLE')} required>
					<input
						id="survey-title"
						type="text"
						value={formData.title}
						onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
						className={cn(INPUT_BASE, 'h-10')}
						placeholder={t('ENTER_SURVEY_TITLE')}
						disabled={isLoading}
						required
					/>
				</Field>

				{/* Description */}
				<Field label={tCommon('DESCRIPTION')}>
					<textarea
						id="survey-description"
						value={formData.description}
						onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
						className={cn(INPUT_BASE, 'py-2.5 resize-none')}
						rows={3}
						placeholder={t('ENTER_SURVEY_DESCRIPTION')}
						disabled={isLoading}
					/>
				</Field>
			</div>

			{/* ── Configuration ──────────────────────────────────────── */}
			<div className="p-5 space-y-4">
				<p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
					{t('CONFIGURATION') || 'Configuration'}
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Type */}
					<Field
						label={t('SURVEY_TYPE')}
						required
						hint={mode === 'edit' ? t('SURVEY_TYPE_CANNOT_BE_CHANGED') : undefined}
					>
						<div className="relative">
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
								className={cn(INPUT_BASE, 'h-10 appearance-none pr-8')}
								disabled={isLoading || mode === 'edit'}
							>
								<option value={SurveyTypeEnum.GLOBAL}>{t('GLOBAL_SURVEY')}</option>
								<option value={SurveyTypeEnum.ITEM}>{t('ITEM_SURVEY')}</option>
							</select>
							<ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
						</div>
					</Field>

					{/* Status */}
					<Field label={t('STATUS')} required>
						<div className="relative">
							<select
								id="survey-status"
								value={formData.status}
								onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as SurveyStatusEnum }))}
								className={cn(INPUT_BASE, 'h-10 appearance-none pr-8')}
								disabled={isLoading}
							>
								<option value={SurveyStatusEnum.DRAFT}>{tCommon('DRAFT')}</option>
								<option value={SurveyStatusEnum.PUBLISHED}>{tCommon('PUBLISHED')}</option>
								<option value={SurveyStatusEnum.CLOSED}>{tCommon('CLOSED')}</option>
							</select>
							<ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
						</div>
					</Field>
				</div>

				{/* Item Selector — only for item surveys */}
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
			</div>

			{/* ── Survey JSON ────────────────────────────────────────── */}
			<div className="p-5 space-y-3">
				<div className="flex items-center justify-between">
					<p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
						{t('SURVEY_DEFINITION_JSON')}
						<span className="ml-0.5 text-red-500">*</span>
					</p>
					{/* Toolbar */}
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={handleFormatJson}
							disabled={isLoading}
							className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50"
						>
							<Braces className="w-3 h-3" />
							{tCommon('FORMAT_JSON')}
						</button>
						<button
							type="button"
							onClick={handleMinifyJson}
							disabled={isLoading}
							className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50"
						>
							<Minimize2 className="w-3 h-3" />
							{tCommon('MINIFY_JSON')}
						</button>
						<button
							type="button"
							onClick={() => setShowImportDialog(true)}
							disabled={isLoading}
							className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50"
						>
							<Download className="w-3 h-3" />
							{t('IMPORT_FROM_SURVEYJS')}
						</button>
						<button
							type="button"
							onClick={handlePreview}
							disabled={isLoading || !!jsonError}
							className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
						>
							<Eye className="w-3 h-3" />
							{t('PREVIEW_SURVEY')}
						</button>
					</div>
				</div>

				{/* JSON Textarea */}
				<div className="relative">
					<textarea
						id="survey-json"
						value={jsonInput}
						onChange={(e) => handleJsonChange(e.target.value)}
						className={cn(
							'w-full px-4 py-3 text-xs font-mono leading-relaxed resize-none rounded-xl',
							'bg-gray-50 dark:bg-white/2',
							'border transition-all duration-150',
							'text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600',
							'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
							'disabled:opacity-50 disabled:cursor-not-allowed',
							jsonError
								? 'border-red-400 dark:border-red-500/60 focus:ring-red-500/20'
								: 'border-gray-200 dark:border-white/8'
						)}
						rows={14}
						placeholder={'{\n  "title": "My Survey",\n  "pages": [...]\n}'}
						disabled={isLoading}
						required
						aria-invalid={!!jsonError}
						aria-describedby={jsonError ? 'survey-json-error' : undefined}
					/>
					{jsonError && (
						<p id="survey-json-error" className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
							<span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
							{jsonError}
						</p>
					)}
				</div>

				{/* Help hint */}
				<div className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-white/2 border border-gray-100 dark:border-white/6">
					<div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
						<Info className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
					</div>
					<div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 min-w-0">
						<p className="font-semibold text-gray-700 dark:text-gray-300">How to create your survey JSON</p>
						<div className="grid sm:grid-cols-2 gap-3">
							<div>
								<p className="font-medium text-gray-600 dark:text-gray-300 mb-1">Option 1 — Import (Recommended)</p>
								<ol className="space-y-0.5 list-decimal list-inside text-gray-500 dark:text-gray-400">
									<li>Click &ldquo;Import from SurveyJS&rdquo; above</li>
									<li>Enter your SurveyJS survey ID</li>
								</ol>
							</div>
							<div>
								<p className="font-medium text-gray-600 dark:text-gray-300 mb-1">Option 2 — Manual</p>
								<ol className="space-y-0.5 list-decimal list-inside text-gray-500 dark:text-gray-400">
									<li>
										Visit{' '}
										<a
											href="https://surveyjs.io/create-free-survey"
											target="_blank"
											rel="noopener noreferrer"
											className="underline font-medium hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
										>
											SurveyJS Creator
										</a>
									</li>
									<li>Design your survey</li>
									<li>Open &ldquo;JSON Editor&rdquo; tab, copy &amp; paste</li>
								</ol>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* ── Actions ────────────────────────────────────────────── */}
			<div className="px-5 py-4 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-end gap-3">
				<button
					type="button"
					onClick={onCancel}
					disabled={isLoading}
					className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
				>
					<X className="w-3.5 h-3.5" />
					{tCommon('CANCEL')}
				</button>
				<button
					type="submit"
					disabled={isLoading || !!jsonError}
					className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
				>
					{isLoading ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : (
						<Save className="w-3.5 h-3.5" />
					)}
					{isLoading ? tCommon('SAVING') : mode === 'create' ? t('CREATE_SURVEY_BTN') : t('UPDATE_SURVEY_BTN')}
				</button>
			</div>

			{/* Dialogs */}
			<SurveyPreviewDialog
				surveyJson={previewJson}
				title={t('SURVEY_PREVIEW')}
				isOpen={showPreview}
				onClose={() => setShowPreview(false)}
			/>
			<ImportSurveyJsDialog
				isOpen={showImportDialog}
				onClose={() => setShowImportDialog(false)}
				onImport={handleImportSurvey}
			/>
		</form>
	);
}
