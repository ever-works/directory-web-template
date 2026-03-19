import { useSettings } from '@/components/providers/settings-provider';

/**
 * Client-side hook to check if tags are enabled
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns boolean - true if tags are enabled, false otherwise
 */
export function useTagsEnabled(): {
	tagsEnabled: boolean;
	loading: boolean;
	error: Error | null;
} {
	const { tagsEnabled } = useSettings();

	// No loading state since value comes from server-rendered context
	return { tagsEnabled, loading: false, error: null };
}
