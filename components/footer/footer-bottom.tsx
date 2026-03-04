import Link from 'next/link';
import { ThemeToggler } from '../theme-toggler';
import { Container } from '../ui/container';
import { VersionDisplay, VersionTooltip } from '../version';
import { SiteLogo } from '../shared/site-logo';
import { processFooterItems } from '@/lib/utils/footer-utils';
import type { Config, FooterSettings } from '@/lib/content';

interface FooterBottomProps {
	config: Config;
	t: (key: string) => string;
	footerSettings: FooterSettings;
}

export function FooterBottom({ config, t, footerSettings }: FooterBottomProps) {
	// Process footer items: use custom footer items if available, otherwise use default links
	const footerItems = processFooterItems(config, t);

	return (
		<div className="relative backdrop-blur-xl bg-white/5 dark:bg-black/5 border-t border-white/10 dark:border-gray-700/20">
			<Container maxWidth="7xl" padding="default" useGlobalWidth className="relative px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex flex-col gap-4">
					{/* Top row: Logo and disclaimer */}
					<div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
						<div className="shrink-0">
							<SiteLogo size="lg" showText={true} />
						</div>

						{/* Disclaimer - smaller text, can be wider now */}
						<div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 leading-relaxed flex-1">
							{t('footer.DISCLAIMER')}
						</div>
					</div>

					{/* Bottom row: Copyright, links, version, theme */}
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-white/10 dark:border-gray-700/20">
						{/* Left side: Copyright and legal links */}
						<div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-gray-600 dark:text-gray-400">
							<span className="text-xs sm:text-sm font-medium">
								Copyright &copy; {config.copyright_year || new Date().getFullYear()}{' '}
								{config.company_name}. {t('footer.ALL_RIGHTS_RESERVED')}.
							</span>
							{footerItems.length > 0 && (
								<>
									<span className="hidden sm:inline text-gray-400 dark:text-gray-600">·</span>
									{footerItems.map((item, index) => (
										<Link
											key={index}
											href={item.href}
											target={item.target}
											rel={item.rel}
											className="text-xs sm:text-sm hover:text-theme-primary transition-colors duration-200"
										>
											{index > 0 && (
												<span className="mr-2 text-gray-400 dark:text-gray-600">·</span>
											)}
											{item.label}
										</Link>
									))}
								</>
							)}
						</div>

						{/* Right side: Version and theme toggle */}
						{(footerSettings.versionEnabled || footerSettings.themeSelectorEnabled) && (
							<div className="flex items-center gap-3">
								{footerSettings.versionEnabled && (
									<VersionTooltip>
										<div className="group cursor-help">
											<VersionDisplay
												variant="inline"
												className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-200"
											/>
										</div>
									</VersionTooltip>
								)}
								{footerSettings.versionEnabled && footerSettings.themeSelectorEnabled && (
									<div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
								)}
								{footerSettings.themeSelectorEnabled && <ThemeToggler openUp />}
							</div>
						)}
					</div>
				</div>
			</Container>
		</div>
	);
}
