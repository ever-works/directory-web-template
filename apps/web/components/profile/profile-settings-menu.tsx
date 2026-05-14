'use client';

import * as Popover from '@radix-ui/react-popover';
import { useState } from 'react';
import {
	FiBriefcase,
	FiCreditCard,
	FiDroplet,
	FiMapPin,
	FiSettings,
	FiUser
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface SettingsEntry {
	href: string;
	icon: React.ReactNode;
	titleKey: string;
	descriptionKey: string;
}

/**
 * Hardcoded shortlist of the `/client/settings/profile/*` destinations the
 * owner should be able to reach from their own profile. Order mirrors the
 * Settings landing page; titles + descriptions come from the existing
 * `settings.SETTINGS_CARDS.*` i18n keys.
 */
const ENTRIES: SettingsEntry[] = [
	{
		href: '/client/settings/profile/basic-info',
		icon: <FiUser className="w-3.5 h-3.5" />,
		titleKey: 'BASIC_INFO.TITLE',
		descriptionKey: 'BASIC_INFO.DESCRIPTION'
	},
	{
		href: '/client/settings/profile/portfolio',
		icon: <FiBriefcase className="w-3.5 h-3.5" />,
		titleKey: 'PORTFOLIO.TITLE',
		descriptionKey: 'PORTFOLIO.DESCRIPTION'
	},
	{
		href: '/client/settings/profile/theme-colors',
		icon: <FiDroplet className="w-3.5 h-3.5" />,
		titleKey: 'THEME_COLORS.TITLE',
		descriptionKey: 'THEME_COLORS.DESCRIPTION'
	},
	{
		href: '/client/settings/profile/location',
		icon: <FiMapPin className="w-3.5 h-3.5" />,
		titleKey: 'LOCATION.TITLE',
		descriptionKey: 'LOCATION.DESCRIPTION'
	},
	{
		href: '/client/settings/profile/billing',
		icon: <FiCreditCard className="w-3.5 h-3.5" />,
		titleKey: 'BILLING.TITLE',
		descriptionKey: 'BILLING.DESCRIPTION'
	}
];

interface ProfileSettingsMenuProps {
	/** Optional tooltip / aria label override. */
	ariaLabel?: string;
}

/**
 * Popover trigger surfaced on the owner's own profile — a compact gear button
 * that opens a panel listing every `/client/settings/profile/*` destination.
 *
 * Built on @radix-ui/react-popover so we get focus trapping, outside-click
 * dismissal, escape-to-close, and portal-rendered content for free.
 */
export function ProfileSettingsMenu({ ariaLabel }: ProfileSettingsMenuProps = {}) {
	const [open, setOpen] = useState(false);
	const t = useTranslations('settings.SETTINGS_CARDS');
	const label = ariaLabel ?? 'Profile settings';

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<button
					type="button"
					aria-label={label}
					title={label}
					className="flex items-center justify-center p-2 rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150 ease-out data-[state=open]:bg-neutral-50 dark:data-[state=open]:bg-white/5 data-[state=open]:border-theme-primary-300/60 dark:data-[state=open]:border-theme-primary-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40"
				>
					<FiSettings className="w-4 h-4" />
				</button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					align="end"
					sideOffset={6}
					collisionPadding={12}
					className="z-50 w-72 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141414] shadow-lg p-1.5 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1"
				>
					<div className="px-2.5 pt-2 pb-1.5">
						<p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
							Profile settings
						</p>
					</div>
					<ul className="flex flex-col">
						{ENTRIES.map((entry) => (
							<li key={entry.href}>
								<Popover.Close asChild>
									<Link
										href={entry.href}
										className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors duration-150 focus-visible:outline-none focus-visible:bg-neutral-50 dark:focus-visible:bg-white/5"
									>
										<span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-theme-primary-50 dark:bg-theme-primary-500/10 text-theme-primary-600 dark:text-theme-primary-400 mt-0.5">
											{entry.icon}
										</span>
										<span className="min-w-0">
											<span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-tight">
												{t(entry.titleKey)}
											</span>
											<span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
												{t(entry.descriptionKey)}
											</span>
										</span>
									</Link>
								</Popover.Close>
							</li>
						))}
					</ul>
					<Popover.Arrow className="fill-white dark:fill-[#141414] stroke-neutral-200 dark:stroke-white/10" strokeWidth={1} />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
