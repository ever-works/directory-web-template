import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounceValue } from './use-debounced-value';

interface UseDebounceSearchProps {
  searchValue: string;
  delay?: number;
  onSearch: (value: string) => void | Promise<void>;
}

interface UseDebounceSearchReturn {
  debouncedValue: string;
  isSearching: boolean;
  clearSearch: () => void;
}

export function useDebounceSearch({
  searchValue,
  delay = 300,
  onSearch,
}: UseDebounceSearchProps): UseDebounceSearchReturn {
  const [isSearching, setIsSearching] = useState(false);
  const debouncedValue = useDebounceValue(searchValue, delay);
  const previousValue = useRef<string>('');

  // Handle search when debounced value changes
  const handleDebouncedSearch = useCallback(
    async (value: string) => {
      if (value === previousValue.current) return;

      previousValue.current = value;

      if (value.trim() === '') {
        setIsSearching(false);
        onSearch('');
        return;
      }

      setIsSearching(true);
      try {
        await onSearch(value);
      } finally {
        setIsSearching(false);
      }
    },
    [onSearch]
  );

  // Trigger search when debounced value changes
  useEffect(() => {
    handleDebouncedSearch(debouncedValue);
  }, [debouncedValue, handleDebouncedSearch]);

  const clearSearch = useCallback(() => {
    setIsSearching(false);
    previousValue.current = '';
  }, []);

  // Determine if we're in a searching state
  const isCurrentlySearching = isSearching || (searchValue !== debouncedValue && searchValue.trim() !== '');

  return {
    debouncedValue,
    isSearching: isCurrentlySearching,
    clearSearch,
  };
}