import { useQuery } from '@tanstack/react-query';
import { useSettings } from '@/components/providers/settings-provider';

const GLOBAL_SURVEYS_EXISTS_QUERY_KEY = ['global-surveys-exists'] as const;
const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

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

interface GlobalSurveysExistsResponse {
	exists: boolean;
}

/**
 * Hook to check if there are any published global surveys.
 * Public routes resolve this lazily so the locale root layout no longer needs
 * to pay a database probe just to decide whether to show the surveys nav item.
 */
export function useHasGlobalSurveys(): UseHasGlobalSurveysResult {
	const { hasGlobalSurveys: initialHasGlobalSurveys, surveysEnabled } = useSettings();

	const { data, isLoading, error } = useQuery<GlobalSurveysExistsResponse, Error>({
		queryKey: GLOBAL_SURVEYS_EXISTS_QUERY_KEY,
		enabled: surveysEnabled,
		queryFn: async () => {
			const response = await fetch('/api/surveys/exists?type=global', {
				cache: 'no-store'
			});

			if (!response.ok) {
				throw new Error('Failed to fetch global survey availability');
			}

			return (await response.json()) as GlobalSurveysExistsResponse;
		},
		initialData: { exists: initialHasGlobalSurveys },
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		refetchOnWindowFocus: false,
		retry: false
	});

	return {
		hasGlobalSurveys: surveysEnabled ? (data?.exists ?? initialHasGlobalSurveys) : false,
		isPending: surveysEnabled && isLoading,
		error: error ?? null
	};
}
