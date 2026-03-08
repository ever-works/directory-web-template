import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Database, Clock, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

interface CacheStatusProps {
  lastUpdated: string | null;
  isStale: boolean;
  onInvalidateCache: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function CacheStatus({
  lastUpdated,
  isStale,
  onInvalidateCache,
  onRefresh,
  isRefreshing
}: CacheStatusProps) {
  const queryClient = useQueryClient();
  
  // Get cache information from React Query
  const queries = queryClient.getQueriesData({});
  const billingQueries = queries.filter(([key]) => 
    Array.isArray(key) && key[0] === 'billing'
  );
  
  const totalQueries = queries.length;
  const billingQueryCount = billingQueries.length;
  const activeQueries = queries.filter(([, data]) => data !== undefined).length;
  const staleQueries = queries.filter(([, data]) => {
    if (!data || typeof data !== 'object' || !('dataUpdatedAt' in data)) return false;
    const staleTime = 5 * 60 * 1000; // 5 minutes
    return Date.now() - (data as any).dataUpdatedAt > staleTime;
  }).length;

  const getStatusColor = () => {
    if (isStale) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/50';
    if (lastUpdated) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50';
    return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700/50';
  };

  const getStatusIcon = () => {
    if (isStale) return <AlertTriangle className="w-4 h-4" />;
    if (lastUpdated) return <CheckCircle className="w-4 h-4" />;
    return <Info className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isStale) return 'Data is stale';
    if (lastUpdated) return 'Data is fresh';
    return 'No data available';
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-theme-primary-100 dark:bg-theme-primary-900/20 rounded-lg flex items-center justify-center border border-theme-primary-200 dark:border-theme-primary-700/50">
            <Database className="w-5 h-5 text-theme-primary-600 dark:text-theme-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cache Status</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">React Query cache information and management</p>
          </div>
        </div>
        
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor()}`}>
          {getStatusIcon()}
          {getStatusText()}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600/50">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Queries</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalQueries}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">All cached queries</div>
        </div>

        <div className="bg-theme-primary-50 dark:bg-theme-primary-900/20 rounded-lg p-4 border border-theme-primary-200 dark:border-theme-primary-700/50">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-4 h-4 text-theme-primary-500 dark:text-theme-primary-400" />
            <span className="text-sm font-medium text-theme-primary-700 dark:text-theme-primary-300">Billing Queries</span>
          </div>
          <div className="text-2xl font-bold text-theme-primary-900 dark:text-theme-primary-100">{billingQueryCount}</div>
          <div className="text-xs text-theme-primary-500 dark:text-theme-primary-400">Billing related</div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Active Queries</span>
          </div>
          <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{activeQueries}</div>
          <div className="text-xs text-emerald-500 dark:text-emerald-400">With data</div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700/50">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Stale Queries</span>
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{staleQueries}</div>
          <div className="text-xs text-orange-500 dark:text-orange-400">Need refresh</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-linear-to-r from-slate-50 to-theme-primary-50 dark:from-slate-700/50 dark:to-theme-primary-900/20 rounded-lg p-4 border border-slate-200 dark:border-slate-600/50 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-theme-primary-100 dark:bg-theme-primary-800/50 rounded-lg flex items-center justify-center border border-theme-primary-200 dark:border-theme-primary-600/50">
              <Info className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Performance Metrics</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">Cache efficiency and performance</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {activeQueries > 0 ? Math.round((activeQueries / totalQueries) * 100) : 0}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Cache Hit Rate</div>
          </div>
        </div>
      </div>

      {/* Last Updated Info */}
      {lastUpdated && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600/50 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Last Updated</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{formatLastUpdated(lastUpdated)}</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(lastUpdated).toLocaleTimeString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(lastUpdated).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cache Configuration */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700/50 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Cache Configuration</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-600 dark:text-blue-400">
          <div>Stale Time: 5 minutes</div>
          <div>GC Time: 10 minutes</div>
          <div>Retry: 3 attempts</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-linear-to-r from-theme-primary-600 to-theme-primary-700 rounded-lg hover:from-theme-primary-700 hover:to-theme-primary-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh All Data'}
        </button>
        
        <button
          onClick={onInvalidateCache}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600/50 hover:border-slate-400 dark:hover:border-slate-500/50 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Invalidate Cache
        </button>
      </div>

      {/* Cache Tips */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <strong>Tip:</strong> The cache automatically manages data freshness and performance. 
          Use &quot;Refresh&quot; to update data and &quot;Invalidate&quot; to clear cached data.
        </div>
      </div>
    </div>
  );
}
