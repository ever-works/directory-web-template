import { useSettings } from '@/components/providers/settings-provider';

interface TagsExistsResult {
	exists: boolean;
}

/**
 * Client-side hook to check if tags exist
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns Object with exists flag - true if tags exist in database
 */
export function useTagsExists(): {
	data: TagsExistsResult | undefined;
	isLoading: boolean;
	error: Error | null;
} {
	const { hasTags } = useSettings();

	// No loading state since value comes from server-rendered context
	return {
		data: { exists: hasTags },
		isLoading: false,
		error: null
	};
}

