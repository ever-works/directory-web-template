import { Component, ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

// Design system constants
const ERROR_CARD_STYLES = "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950";
const ERROR_TITLE_STYLES = "flex items-center space-x-2 text-red-800 dark:text-red-200";
const ERROR_TEXT_STYLES = "text-sm text-red-700 dark:text-red-300";
const ERROR_BUTTON_STYLES = "border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Admin component error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <Card className={ERROR_CARD_STYLES}>
          <CardHeader>
            <CardTitle className={ERROR_TITLE_STYLES}>
              <AlertTriangle className="h-5 w-5" />
              <span>Something went wrong</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className={ERROR_TEXT_STYLES}>
                {this.state.error?.message || 'An unexpected error occurred while loading this component.'}
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleRetry}
                  className={ERROR_BUTTON_STYLES}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper for easier use
// Can be used as a fallback prop: fallback={(e, r) => <AdminErrorFallback error={e} retry={r} />}
export function AdminErrorFallback({ 
  error, 
  retry 
}: { 
  error?: Error; 
  retry: () => void; 
}) {
  const t = useTranslations('admin.ERROR_BOUNDARY');
  
  return (
    <Card className={ERROR_CARD_STYLES}>
      <CardHeader>
        <CardTitle className={ERROR_TITLE_STYLES}>
          <AlertTriangle className="h-5 w-5" />
          <span>{t('FAILED_TO_LOAD_DATA')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className={ERROR_TEXT_STYLES}>
            {error?.message || t('UNABLE_TO_LOAD')}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              className={ERROR_BUTTON_STYLES}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('RETRY')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Wrapper component that provides translations to the class component
export function AdminErrorBoundaryWithTranslations({ 
  children, 
  fallback, 
  onError 
}: Props) {
  const t = useTranslations('admin.ERROR_BOUNDARY');
  
  const translatedFallback = (error: Error, retry: () => void) => {
    if (fallback) {
      return fallback(error, retry);
    }
    
    return (
      <Card className={ERROR_CARD_STYLES}>
        <CardHeader>
          <CardTitle className={ERROR_TITLE_STYLES}>
            <AlertTriangle className="h-5 w-5" />
            <span>{t('SOMETHING_WENT_WRONG')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className={ERROR_TEXT_STYLES}>
              {error?.message || t('UNEXPECTED_ERROR')}
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={retry}
                className={ERROR_BUTTON_STYLES}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('TRY_AGAIN')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <AdminErrorBoundary fallback={translatedFallback} onError={onError}>
      {children}
    </AdminErrorBoundary>
  );
}
