import { useSettings } from '@/components/providers/settings-provider';

/**
 * Result type for useHasGlobalSurveys hook
 */
interface UseHasGlobalSurveysResult {
	/** Whether there are published global surveys */
	hasGlobalSurveys: boolean;
	/** Whether the check is currently loading */
	isPending: boolean;
	/** Error if the check failed */
	error: Error | null;
}

/**
 * Hook to check if there are any published global surveys
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns {UseHasGlobalSurveysResult} Whether global surveys exist and loading state
 */
export function useHasGlobalSurveys(): UseHasGlobalSurveysResult {
	const { hasGlobalSurveys } = useSettings();

	// No loading state since value comes from server-rendered context
	return {
		hasGlobalSurveys,
		isPending: false,
		error: null
	};
}
