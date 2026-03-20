'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onRetry?: () => void;
}

interface MapErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

/**
 * Error boundary specifically for map components.
 * Catches errors during rendering and displays a fallback UI.
 */
export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
	constructor(props: MapErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		console.error('Map error boundary caught error:', error, errorInfo);
	}

	handleRetry = (): void => {
		this.setState({ hasError: false, error: null });
		this.props.onRetry?.();
	};

	render(): ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/6">
					<AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
						Map failed to load
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
						{this.state.error?.message || 'An unexpected error occurred while loading the map.'}
					</p>
					<Button onClick={this.handleRetry} variant="outline" size="sm">
						<RefreshCw className="w-4 h-4 mr-2" />
						Try Again
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}
