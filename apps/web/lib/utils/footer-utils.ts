import { isExternalUrl, resolveLabel } from './custom-navigation';
import type { CustomNavigationItem } from '@/lib/content';

/**
 * Type for translation function from next-intl
 */
export type TranslationFunction = (key: string) => string;

/**
 * Type for footer configuration (subset of Config needed for footer processing)
 */
export interface FooterConfig {
	custom_footer?: CustomNavigationItem[];
}

/**
 * Type for processed footer item
 */
export interface FooterItem {
	label: string;
	href: string;
	target?: string;
	rel?: string;
}

/**
 * Default footer links configuration
 */
const DEFAULT_FOOTER_LINKS: Array<{ label: string; href: string }> = [
	{ label: 'footer.TERMS_OF_SERVICE', href: '/pages/terms-of-service' },
	{ label: 'footer.PRIVACY_POLICY', href: '/pages/privacy-policy' },
	{ label: 'footer.COOKIES', href: '/pages/cookies' }
];

/**
 * Processes footer items from configuration
 *
 * Uses custom footer items if available, otherwise falls back to default legal links.
 * Custom footer items replace default links, they do not extend them.
 *
 * Handles validation, external URL detection, and label resolution.
 *
 * @param config - Footer configuration containing custom_footer items
 * @param t - Translation function from next-intl
 * @returns Array of processed footer items ready for rendering
 */
export function processFooterItems(config: FooterConfig, t: TranslationFunction): FooterItem[] {
	const customFooter = config.custom_footer;
	const hasCustomFooter = customFooter && Array.isArray(customFooter) && customFooter.length > 0;

	if (hasCustomFooter && customFooter) {
		// Use only custom footer items if they are available
		return customFooter
			.filter((item, index) => {
				// Validate item structure
				if (!item || typeof item !== 'object' || !item.label || !item.path) {
					console.warn(`Invalid custom_footer item at index ${index}:`, item);
					return false;
				}
				return true;
			})
			.map((item) => {
				const isExternal = isExternalUrl(item.path);
				return {
					label: resolveLabel(item.label, t),
					href: item.path,
					...(isExternal && {
						target: '_blank',
						rel: 'noopener noreferrer'
					})
				};
			});
	}

	// Use default links only if no custom footer items are available
	return DEFAULT_FOOTER_LINKS.map((item) => ({
		...item,
		label: resolveLabel(item.label, t)
	}));
}
