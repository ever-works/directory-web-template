'use client';

import { LanguageSwitcher } from './language-switcher';
import { ThemeToggler } from './theme-toggler';
import { LayoutSwitcher } from './layout-switcher';
import { useHeaderSettings } from '@/hooks/use-header-settings';
import { isDemoMode } from '@/lib/utils';

export function NavigationControls() {
	const { settings } = useHeaderSettings();
	const isDemo = isDemoMode();

	return (
		<div className="flex items-center gap-2 md:gap-3 transition-all duration-300">
			{settings.layoutEnabled && isDemo && (
				<div className="hidden sm:block">
					<LayoutSwitcher inline={false} iconOnly={true} />
				</div>
			)}
			{settings.languageEnabled && <LanguageSwitcher />}
			{settings.themeEnabled && <ThemeToggler iconOnly={!isDemo} />}
		</div>
	);
}
