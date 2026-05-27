import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * have elapsed without a further change. Use to throttle the downstream
 * effect of rapidly-changing inputs (search boxes, sliders, resize
 * listeners) into a single eventual update.
 *
 * The debounced value lags the live value — read `value` when you need
 * the instantaneous state, and read the return value when you need the
 * "settled" state. The timer is reset on every change to `value` or
 * `delay`, so changing `delay` mid-flight extends the wait.
 *
 * @template T - Type of the value being debounced.
 * @param value - The live value to debounce.
 * @param delay - Debounce window in milliseconds. Defaults to 300.
 * @returns The most recently settled value of `value`.
 *
 * @example
 * const debouncedQuery = useDebounceValue(query, 500);
 * useEffect(() => { search(debouncedQuery); }, [debouncedQuery]);
 */
export function useDebounceValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}