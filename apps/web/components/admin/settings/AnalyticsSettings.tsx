'use client';

import { useTranslations } from 'next-intl';
import { SettingSwitch } from './SettingSwitch';
import { SettingInput } from './SettingInput';
import { 
	BarChart3, 
	Globe, 
	Zap, 
	Database, 
	Share2,
	CheckCircle2,
	XCircle
} from 'lucide-react';

interface AnalyticsSettingsProps {
	settings: any;
	updateSetting: (key: string, value: any) => Promise<void>;
	saving: boolean;
}

const PROVIDER_CARD_CLASSES = [
	'p-6',
	'bg-gray-50/50',
	'dark:bg-white/2',
	'rounded-xl',
	'border',
	'border-gray-200',
	'dark:border-white/6',
	'transition-all',
	'hover:shadow-sm'
].join(' ');

const PROVIDER_HEADER_CLASSES = 'flex items-center justify-between mb-6';
const PROVIDER_TITLE_WRAPPER_CLASSES = 'flex items-center space-x-3';
const PROVIDER_ICON_CLASSES = 'w-5 h-5 text-theme-primary';
const PROVIDER_TITLE_CLASSES = 'text-base font-semibold text-gray-900 dark:text-gray-100';
const PROVIDER_DESC_CLASSES = 'text-sm text-gray-500 dark:text-gray-400 mt-1';
const STATUS_BADGE_CLASSES = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium';

export function AnalyticsSettings({ settings, updateSetting, saving }: AnalyticsSettingsProps) {
	const t = useTranslations('admin.ADMIN_SETTINGS_PAGE');
	const analytics = settings.analytics || {};

	const renderStatusBadge = (enabled: boolean) => {
		if (enabled) {
			return (
				<span className={`${STATUS_BADGE_CLASSES} bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400`}>
					<CheckCircle2 className="w-3.5 h-3.5" />
					<span>Enabled</span>
				</span>
			);
		}
		return (
			<span className={`${STATUS_BADGE_CLASSES} bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400`}>
				<XCircle className="w-3.5 h-3.5" />
				<span>Disabled</span>
			</span>
		);
	};

	return (
		<div className="space-y-6 mt-4">
			{/* Google Analytics */}
			<div className={PROVIDER_CARD_CLASSES}>
				<div className={PROVIDER_HEADER_CLASSES}>
					<div className={PROVIDER_TITLE_WRAPPER_CLASSES}>
						<BarChart3 className={PROVIDER_ICON_CLASSES} />
						<div>
							<h4 className={PROVIDER_TITLE_CLASSES}>{t('ANALYTICS_GA_TITLE')}</h4>
							<p className={PROVIDER_DESC_CLASSES}>{t('ANALYTICS_GA_DESC')}</p>
						</div>
					</div>
					{renderStatusBadge(analytics.googleAnalytics?.enabled)}
				</div>
				
				<SettingSwitch
					label={t('ANALYTICS_GA_ENABLED_LABEL')}
					value={analytics.googleAnalytics?.enabled ?? false}
					onChange={(value) => updateSetting('analytics.googleAnalytics.enabled', value)}
					disabled={saving}
				/>

				{analytics.googleAnalytics?.enabled && (
					<div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/6 animate-in fade-in slide-in-from-top-2 duration-300">
						<SettingInput
							label={t('ANALYTICS_GA_MEASUREMENT_ID_LABEL')}
							value={analytics.googleAnalytics?.measurementId ?? ''}
							placeholder={t('ANALYTICS_GA_MEASUREMENT_ID_PLACEHOLDER')}
							onChange={(value) => updateSetting('analytics.googleAnalytics.measurementId', value)}
							disabled={saving}
						/>
					</div>
				)}
			</div>

			{/* Plausible */}
			<div className={PROVIDER_CARD_CLASSES}>
				<div className={PROVIDER_HEADER_CLASSES}>
					<div className={PROVIDER_TITLE_WRAPPER_CLASSES}>
						<Globe className={PROVIDER_ICON_CLASSES} />
						<div>
							<h4 className={PROVIDER_TITLE_CLASSES}>{t('ANALYTICS_PLAUSIBLE_TITLE')}</h4>
							<p className={PROVIDER_DESC_CLASSES}>{t('ANALYTICS_PLAUSIBLE_DESC')}</p>
						</div>
					</div>
					{renderStatusBadge(analytics.plausible?.enabled)}
				</div>
				
				<SettingSwitch
					label={t('ANALYTICS_PLAUSIBLE_ENABLED_LABEL')}
					value={analytics.plausible?.enabled ?? false}
					onChange={(value) => updateSetting('analytics.plausible.enabled', value)}
					disabled={saving}
				/>

				{analytics.plausible?.enabled && (
					<div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/6 animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
						<SettingInput
							label={t('ANALYTICS_PLAUSIBLE_DOMAIN_LABEL')}
							value={analytics.plausible?.domain ?? ''}
							placeholder={t('ANALYTICS_PLAUSIBLE_DOMAIN_PLACEHOLDER')}
							onChange={(value) => updateSetting('analytics.plausible.domain', value)}
							disabled={saving}
						/>
						<SettingInput
							label={t('ANALYTICS_PLAUSIBLE_SCRIPT_ID_LABEL')}
							value={analytics.plausible?.scriptId ?? ''}
							placeholder={t('ANALYTICS_PLAUSIBLE_SCRIPT_ID_PLACEHOLDER')}
							onChange={(value) => updateSetting('analytics.plausible.scriptId', value)}
							disabled={saving}
						/>
					</div>
				)}
			</div>

			{/* DataFast */}
			<div className={PROVIDER_CARD_CLASSES}>
				<div className={PROVIDER_HEADER_CLASSES}>
					<div className={PROVIDER_TITLE_WRAPPER_CLASSES}>
						<Zap className={PROVIDER_ICON_CLASSES} />
						<div>
							<h4 className={PROVIDER_TITLE_CLASSES}>{t('ANALYTICS_DATAFAST_TITLE')}</h4>
							<p className={PROVIDER_DESC_CLASSES}>{t('ANALYTICS_DATAFAST_DESC')}</p>
						</div>
					</div>
					{renderStatusBadge(analytics.dataFast?.enabled)}
				</div>
				
				<SettingSwitch
					label={t('ANALYTICS_DATAFAST_ENABLED_LABEL')}
					value={analytics.dataFast?.enabled ?? false}
					onChange={(value) => updateSetting('analytics.dataFast.enabled', value)}
					disabled={saving}
				/>

				{analytics.dataFast?.enabled && (
					<div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/6 animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
						<SettingInput
							label={t('ANALYTICS_DATAFAST_WEBSITE_ID_LABEL')}
							value={analytics.dataFast?.websiteId ?? ''}
							placeholder={t('ANALYTICS_DATAFAST_WEBSITE_ID_PLACEHOLDER')}
							onChange={(value) => updateSetting('analytics.dataFast.websiteId', value)}
							disabled={saving}
						/>
						<SettingInput
							label={t('ANALYTICS_DATAFAST_DOMAIN_LABEL')}
							value={analytics.dataFast?.domain ?? ''}
							placeholder={t('ANALYTICS_DATAFAST_DOMAIN_PLACEHOLDER')}
							onChange={(value) => updateSetting('analytics.dataFast.domain', value)}
							disabled={saving}
						/>
					</div>
				)}
			</div>

			{/* Jitsu */}
			<div className={PROVIDER_CARD_CLASSES}>
				<div className={PROVIDER_HEADER_CLASSES}>
					<div className={PROVIDER_TITLE_WRAPPER_CLASSES}>
						<Database className={PROVIDER_ICON_CLASSES} />
						<div>
							<h4 className={PROVIDER_TITLE_CLASSES}>{t('ANALYTICS_JITSU_TITLE')}</h4>
							<p className={PROVIDER_DESC_CLASSES}>{t('ANALYTICS_JITSU_DESC')}</p>
						</div>
					</div>
					{renderStatusBadge(analytics.jitsu?.enabled)}
				</div>
				
				<SettingSwitch
					label={t('ANALYTICS_JITSU_ENABLED_LABEL')}
					value={analytics.jitsu?.enabled ?? false}
					onChange={(value) => updateSetting('analytics.jitsu.enabled', value)}
					disabled={saving}
				/>

				{analytics.jitsu?.enabled && (
					<div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/6 animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
						<SettingInput
							label={t('ANALYTICS_JITSU_KEY_LABEL')}
							value={analytics.jitsu?.key ?? ''}
							placeholder={t('ANALYTICS_JITSU_KEY_PLACEHOLDER')}
							onChange={(value) => updateSetting('analytics.jitsu.key', value)}
							disabled={saving}
						/>
						<SettingInput
							label={t('ANALYTICS_JITSU_DOMAIN_LABEL')}
							value={analytics.jitsu?.domain ?? ''}
							placeholder={t('ANALYTICS_JITSU_DOMAIN_PLACEHOLDER')}
							onChange={(value) => updateSetting('analytics.jitsu.domain', value)}
							disabled={saving}
						/>
						<SettingInput
							label={t('ANALYTICS_JITSU_HOST_LABEL')}
							value={analytics.jitsu?.host ?? ''}
							placeholder={t('ANALYTICS_JITSU_HOST_PLACEHOLDER')}
							onChange={(value) => updateSetting('analytics.jitsu.host', value)}
							disabled={saving}
						/>
					</div>
				)}
			</div>

			{/* Segment */}
			<div className={PROVIDER_CARD_CLASSES}>
				<div className={PROVIDER_HEADER_CLASSES}>
					<div className={PROVIDER_TITLE_WRAPPER_CLASSES}>
						<Share2 className={PROVIDER_ICON_CLASSES} />
						<div>
							<h4 className={PROVIDER_TITLE_CLASSES}>{t('ANALYTICS_SEGMENT_TITLE')}</h4>
							<p className={PROVIDER_DESC_CLASSES}>{t('ANALYTICS_SEGMENT_DESC')}</p>
						</div>
					</div>
					{renderStatusBadge(analytics.segment?.enabled)}
				</div>
				
				<SettingSwitch
					label={t('ANALYTICS_SEGMENT_ENABLED_LABEL')}
					value={analytics.segment?.enabled ?? false}
					onChange={(value) => updateSetting('analytics.segment.enabled', value)}
					disabled={saving}
				/>

				{analytics.segment?.enabled && (
					<div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/6 animate-in fade-in slide-in-from-top-2 duration-300">
						<SettingInput
							label={t('ANALYTICS_SEGMENT_WRITE_KEY_LABEL')}
							value={analytics.segment?.writeKey ?? ''}
							placeholder={t('ANALYTICS_SEGMENT_WRITE_KEY_PLACEHOLDER')}
							onChange={(value) => updateSetting('analytics.segment.writeKey', value)}
							disabled={saving}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
