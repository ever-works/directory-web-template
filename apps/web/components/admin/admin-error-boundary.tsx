import { Component, ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function ErrorCard({ title, message, onRetry, retryLabel }: {
  title: string;
  message: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <Card className="border-red-200/60 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/30">
      <CardContent className="flex flex-col items-center text-center px-6 py-8">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1.5">{title}</h3>
        <p className="text-sm text-red-600/80 dark:text-red-300/80 leading-relaxed max-w-xs">{message}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-5 h-8 px-4 text-xs font-semibold rounded-xl border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40 transition-all duration-200 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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
        <ErrorCard
          title="Something went wrong"
          message={this.state.error?.message || 'An unexpected error occurred while loading this component.'}
          onRetry={this.handleRetry}
          retryLabel="Try Again"
        />
      );
    }

    return this.props.children;
  }
}

export function AdminErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  const t = useTranslations('admin.ERROR_BOUNDARY');

  return (
    <ErrorCard
      title={t('FAILED_TO_LOAD_DATA')}
      message={error?.message || t('UNABLE_TO_LOAD')}
      onRetry={retry}
      retryLabel={t('RETRY')}
    />
  );
}

export function AdminErrorBoundaryWithTranslations({ children, fallback, onError }: Props) {
  const t = useTranslations('admin.ERROR_BOUNDARY');

  const translatedFallback = (error: Error, retry: () => void) => {
    if (fallback) return fallback(error, retry);

    return (
      <ErrorCard
        title={t('SOMETHING_WENT_WRONG')}
        message={error?.message || t('UNEXPECTED_ERROR')}
        onRetry={retry}
        retryLabel={t('TRY_AGAIN')}
      />
    );
  };

  return (
    <AdminErrorBoundary fallback={translatedFallback} onError={onError}>
      {children}
    </AdminErrorBoundary>
  );
}
