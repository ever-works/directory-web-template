import { useState, useCallback } from 'react';
import { addImageDomain, removeImageDomain, getAllowedDomains, isAllowedImageDomain } from '@/lib/utils/image-domains';

/**
 * Hook for managing image domains dynamically
 */
export function useImageDomains() {
	const [domains, setDomains] = useState(getAllowedDomains());

	const addDomain = useCallback((domain: string, isIconDomain: boolean = false) => {
		addImageDomain(domain, isIconDomain);
		setDomains(getAllowedDomains());
	}, []);

	const removeDomain = useCallback((domain: string) => {
		const normalized = domain.trim().toLowerCase().replace(/^\*\./, '');
		removeImageDomain(normalized);
		setDomains(getAllowedDomains());
	}, []);

	const checkDomain = useCallback((url: string) => {
		return isAllowedImageDomain(url);
	}, []);

	return {
		domains,
		addDomain,
		removeDomain,
		checkDomain
	};
}

/**
 * Hook for validating image URLs before using them
 */
export function useImageValidation() {
	const checkImageUrl = useCallback((url: string): { isValid: boolean; error?: string } => {
		try {
			if (!/^https?:\/\//i.test(url)) {
				return { isValid: true };
			}
			const parsed = new URL(url);
			if (!isAllowedImageDomain(url)) {
				return {
					isValid: false,

					error: `Domain not allowed. Add ${parsed.hostname} to image domains configuration.`
				};
			}

			return { isValid: true };
		} catch (_error) {
			return {
				isValid: false,
				error: 'Invalid URL format'
			};
		}
	}, []);

	return { checkImageUrl };
}
