import { useEffect, useState } from 'react';
import { analytics } from '@/lib/analytics';

export function useFeatureFlag(flagKey: string, defaultValue = false): boolean {
  const [isEnabled, setIsEnabled] = useState(defaultValue);

  useEffect(() => {
    const checkFlag = () => {
      const enabled = analytics.isFeatureEnabled(flagKey, defaultValue);
      setIsEnabled(enabled);
    };

    // Check initially
    checkFlag();

    // Set up polling for flag changes (optional, adjust interval as needed)
    const interval = setInterval(() => {
      checkFlag();
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [flagKey, defaultValue]);

  return isEnabled;
}

// Example usage:
// const isFeatureEnabled = useFeatureFlag('new-feature', false); 