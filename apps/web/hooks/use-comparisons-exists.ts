import { useSettings } from '@/components/providers/settings-provider';

interface ComparisonsExistsResult {
  exists: boolean;
}

export function useComparisonsExists(): {
  data: ComparisonsExistsResult | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { hasComparisons } = useSettings();

  return {
    data: { exists: hasComparisons },
    isLoading: false,
    error: null,
  };
}
