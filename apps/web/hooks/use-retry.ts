import { useState, useCallback, useRef, useMemo } from 'react';

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
  jitter: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  jitter: true,
};

interface RetryState {
  attempt: number;
  isRetrying: boolean;
  lastError: Error | null;
}

interface UseRetryReturn {
  retry: <T>(fn: () => Promise<T>) => Promise<T>;
  reset: () => void;
  state: RetryState;
}

export function useRetry(config: Partial<RetryConfig> = {}): UseRetryReturn {
  const retryConfig = useMemo(() => ({ ...DEFAULT_RETRY_CONFIG, ...config }), [config]);
  const [state, setState] = useState<RetryState>({
    attempt: 0,
    isRetrying: false,
    lastError: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDelay = useCallback((attempt: number): number => {
    const baseDelay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt);
    const cappedDelay = Math.min(baseDelay, retryConfig.maxDelay);
    
    if (retryConfig.jitter) {
      const jitter = Math.random() * 0.3 + 0.85; // 85% to 115% of base delay
      return Math.floor(cappedDelay * jitter);
    }
    
    return Math.floor(cappedDelay);
  }, [retryConfig]);

  const retry = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    let lastError: Error;
    
    // Abort previous retry attempts
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        setState(prev => ({
          ...prev,
          attempt,
          isRetrying: attempt > 0,
          lastError: null,
        }));

        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation aborted');
        }

        const result = await fn();
        
        // Success - reset state
        setState(prev => ({
          ...prev,
          attempt: 0,
          isRetrying: false,
          lastError: null,
        }));
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on abort
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        
        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('4')) {
          throw error;
        }
        
        // Update error state
        setState(prev => ({
          ...prev,
          lastError,
        }));
        
        // If this was the last attempt, throw the error
        if (attempt === retryConfig.maxRetries) {
          break;
        }
        
        // Wait before retrying
        const delay = calculateDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries failed
    throw lastError!;
  }, [retryConfig.maxRetries, calculateDelay]);

  const reset = useCallback(() => {
    // Abort any ongoing retry
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState({
      attempt: 0,
      isRetrying: false,
      lastError: null,
    });
  }, []);

  return {
    retry,
    reset,
    state,
  };
}

/**
 * Hook for retrying specific operations with custom error handling
 */
export function useRetryOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
) {
  const { retry, reset, state } = useRetry(config);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async () => {
    setLoading(true);
    try {
      const result = await retry(operation);
      setData(result);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [retry, operation]);

  return {
    execute,
    reset,
    data,
    loading,
    ...state,
  };
}
