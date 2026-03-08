'use client';

import React from 'react';
import { analytics } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  isRetrying: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isRetrying: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only capture exceptions on the client side
    if (typeof window !== 'undefined') {
      analytics.captureException(error, {
        ...errorInfo,
        componentStack: errorInfo.componentStack,
        type: 'react-error-boundary',
      });
    }
    
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ isRetrying: true });
    
    // Simulate a small delay for better UX
    setTimeout(() => {
      this.setState({ hasError: false, error: undefined, errorInfo: undefined, isRetrying: false });
    }, 500);
  };



  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-red-50 via-white to-orange-50 dark:from-red-950 dark:via-gray-900 dark:to-orange-950">
          <div className="text-center px-6 py-12 max-w-2xl mx-auto">
            {/* Error Icon */}
            <div className="mb-8 flex justify-center">
              <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Main Error Message */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Oops! Something went wrong
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                We&apos;ve encountered an unexpected error. Our team has been notified and is working to fix the issue.
              </p>
            </div>

            {/* Error Details (Collapsible) */}
            {this.state.error && (
              <details className="mb-8 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-2">
                  Show error details
                </summary>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-40">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button
                onClick={this.handleRetry}
                disabled={this.state.isRetrying}
                className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-white hover:bg-theme-primary/90"
              >
                {this.state.isRetrying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {this.state.isRetrying ? 'Retrying...' : 'Try Again'}
              </Button>
              
            </div>

            {/* Technical Info */}
            <div className="mt-8 text-xs text-gray-500 dark:text-gray-400">
              <p>
                Error ID: {this.state.error?.name || 'Unknown'} | 
                Timestamp: {new Date().toLocaleString()} | 
                URL: {typeof window !== 'undefined' ? window.location.pathname : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
