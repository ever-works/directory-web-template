import { useSettings } from '@/components/providers/settings-provider';

interface CollectionsExistsResult {
  exists: boolean;
}

/**
 * Client-side hook to check if collections exist
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns Object with exists flag - true if collections exist in database
 */
export function useCollectionsExists(): {
  data: CollectionsExistsResult | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { hasCollections } = useSettings();

  // No loading state since value comes from server-rendered context
  return {
    data: { exists: hasCollections },
    isLoading: false,
    error: null
  };
}

