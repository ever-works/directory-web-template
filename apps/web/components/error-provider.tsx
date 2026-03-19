'use client';

import React, { useEffect } from 'react';
import { ErrorBoundary } from './error-boundary';

interface ErrorProviderProps {
  children: React.ReactNode;
}

/**
 * Global error provider component that wraps the application
 * with error handling capabilities
 */
export function ErrorProvider({ children }: ErrorProviderProps) {
  useEffect(() => {
    // Set up client-side global error handlers
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[Global Error]', event.error);
      // Here you could send the error to an error tracking service
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Rejection]', event.reason);
      // Here you could send the rejection to an error tracking service
    };

    // Add event listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorProvider;
