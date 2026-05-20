'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Globe, Lock, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Link } from '@/i18n/navigation';
import { useProfileVisibility } from '@/hooks/use-profile-visibility';
import type { ProfileVisibility } from '@/lib/validations/user-profile';

interface VisibilityOption {
	value: ProfileVisibility;
	icon: typeof Globe;
	titleKey: string;
	descriptionKey: string;
	bulletKeys: string[];
}

const OPTIONS: VisibilityOption[] = [
	{
		value: 'public',
		icon: Globe,
		titleKey: 'PUBLIC_TITLE',
		descriptionKey: 'PUBLIC_DESCRIPTION',
		bulletKeys: ['PUBLIC_BULLET_1', 'PUBLIC_BULLET_2', 'PUBLIC_BULLET_3']
	},
	{
		value: 'private',
		icon: Lock,
		titleKey: 'PRIVATE_TITLE',
		descriptionKey: 'PRIVATE_DESCRIPTION',
		bulletKeys: ['PRIVATE_BULLET_1', 'PRIVATE_BULLET_2', 'PRIVATE_BULLET_3']
	}
];

export function ProfileVisibilityForm() {
	const t = useTranslations('settings.VISIBILITY_SETTINGS');
	const { visibility, username, isLoading, isSaving, setVisibility } = useProfileVisibility();

	// Optimistic local state — keeps the radio cards / toggle responsive while the
	// PATCH is in flight; the React Query mutation reconciles on success.
	const [selected, setSelected] = useState<ProfileVisibility>(visibility);

	useEffect(() => {
		setSelected(visibility);
	}, [visibility]);

	const handleChange = async (next: ProfileVisibility) => {
		if (next === selected || isSaving) return;
		const previous = selected;
		setSelected(next);
		try {
			await setVisibility(next);
			toast.success(next === 'public' ? t('SAVED_PUBLIC') : t('SAVED_PRIVATE'));
		} catch {
			setSelected(previous);
			toast.error(t('SAVE_ERROR'));
		}
	};

	const isPublic = selected === 'public';

	return (
		<Card className="border border-gray-200 dark:border-white/6 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-sm shadow-lg max-w-3xl mx-auto">
			<CardHeader className="pb-4 border-b border-gray-100 dark:border-white/6">
				<CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
					{isPublic ? (
						<Globe className="w-5 h-5 text-theme-primary-500" />
					) : (
						<Lock className="w-5 h-5 text-gray-500" />
					)}
					{t('CARD_TITLE')}
				</CardTitle>
				<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('CARD_HELP')}</p>
			</CardHeader>

			<CardContent className="space-y-6 pt-6">
				{/* Top toggle row — same affordance as Upwork's profile visibility switch */}
				<div className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-white/8 bg-gray-50/60 dark:bg-white/[0.02] p-4">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
								{t('TOGGLE_LABEL')}
							</span>
							<span
								className={cn(
									'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
									isPublic
										? 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/30'
										: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-white/8'
								)}
							>
								{isPublic ? t('STATUS_PUBLIC') : t('STATUS_PRIVATE')}
							</span>
						</div>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
							{isPublic ? t('TOGGLE_HELP_PUBLIC') : t('TOGGLE_HELP_PRIVATE')}
						</p>
						{isPublic && username && (
							<Link
								href={`/client/profile/${username}`}
								className="inline-flex items-center gap-1 text-xs font-medium text-theme-primary-600 dark:text-theme-primary-400 hover:underline mt-2"
							>
								<ExternalLink className="w-3 h-3" aria-hidden="true" />
								{t('VIEW_PUBLIC_PROFILE')}
							</Link>
						)}
					</div>
					<div className="flex items-center gap-2 shrink-0 pt-0.5">
						{isSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
						<Switch
							checked={isPublic}
							onCheckedChange={(checked) => handleChange(checked ? 'public' : 'private')}
							disabled={isLoading}
							aria-label={t('TOGGLE_LABEL')}
						/>
					</div>
				</div>

				{/* Radio cards — make the trade-offs explicit, like Upwork's visibility chooser */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{OPTIONS.map((option) => {
						const Icon = option.icon;
						const isSelected = selected === option.value;
						return (
							<button
								key={option.value}
								type="button"
								onClick={() => handleChange(option.value)}
								disabled={isLoading || isSaving}
								aria-pressed={isSelected}
								className={cn(
									'flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed',
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2',
									isSelected
										? 'border-theme-primary-500 bg-theme-primary-50 dark:bg-theme-primary-900/20'
										: 'border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.02] hover:border-theme-primary-200 dark:hover:border-theme-primary-700/50 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
								)}
							>
								<div className="flex items-center gap-2 w-full">
									<div
										className={cn(
											'w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0',
											isSelected
												? 'bg-theme-primary-100 dark:bg-theme-primary-800/50'
												: 'bg-gray-100 dark:bg-white/8'
										)}
									>
										<Icon
											className={cn(
												'w-4 h-4',
												isSelected
													? 'text-theme-primary-600 dark:text-theme-primary-400'
													: 'text-gray-500 dark:text-gray-400'
											)}
										/>
									</div>
									<p
										className={cn(
											'text-sm font-semibold',
											isSelected
												? 'text-theme-primary-700 dark:text-theme-primary-300'
												: 'text-gray-700 dark:text-gray-300'
										)}
									>
										{t(option.titleKey)}
									</p>
									<span
										className={cn(
											'ml-auto inline-flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors shrink-0',
											isSelected
												? 'border-theme-primary-500 bg-theme-primary-500'
												: 'border-gray-300 dark:border-white/20'
										)}
										aria-hidden="true"
									>
										{isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
									</span>
								</div>
								<p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
									{t(option.descriptionKey)}
								</p>
								<ul className="space-y-1 w-full">
									{option.bulletKeys.map((key) => (
										<li
											key={key}
											className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
										>
											<span
												className={cn(
													'mt-1 w-1 h-1 rounded-full shrink-0',
													isSelected
														? 'bg-theme-primary-500'
														: 'bg-gray-300 dark:bg-white/20'
												)}
												aria-hidden="true"
											/>
											<span>{t(key)}</span>
										</li>
									))}
								</ul>
							</button>
						);
					})}
				</div>

				<p className="text-xs text-gray-500 dark:text-gray-400">{t('FOOTER_HELP')}</p>
			</CardContent>
		</Card>
	);
}
