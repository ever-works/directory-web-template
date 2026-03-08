import { useState } from 'react';
import { Search, Filter, Calendar, CreditCard, X, RefreshCw, Download } from 'lucide-react';

interface SearchAndFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalResults: number;
}

interface FilterOption {
  id: string;
  label: string;
  value: string;
  count?: number;
}

const statusFilters: FilterOption[] = [
  { id: 'paid', label: 'Paid', value: 'paid' },
  { id: 'pending', label: 'Pending', value: 'pending' },
  { id: 'failed', label: 'Failed', value: 'failed' },
  { id: 'draft', label: 'Draft', value: 'draft' }
];

export function SearchAndFilters({
  searchTerm,
  onSearchChange,
  onRefresh,
  isRefreshing,
  totalResults
}: SearchAndFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleFilterToggle = (filterValue: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterValue) 
        ? prev.filter(f => f !== filterValue)
        : [...prev, filterValue]
    );
  };

  const clearAllFilters = () => {
    setSelectedFilters([]);
    onSearchChange('');
  };

  const hasActiveFilters = selectedFilters.length > 0 || searchTerm.length > 0;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-theme-primary-100 dark:bg-theme-primary-20 rounded-lg flex items-center justify-center border border-theme-primary-200 dark:border-theme-primary-500">
            <Search className="w-5 h-5 text-theme-primary-600 dark:text-theme-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Search & Filters</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {totalResults} result{totalResults !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              showFilters
                ? 'bg-theme-primary-100 dark:bg-theme-primary-900/20 text-theme-primary-700 dark:text-theme-primary-300 border border-theme-primary-200 dark:border-theme-primary-700/50'
                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600/50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {selectedFilters.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-theme-primary-600 dark:bg-theme-primary-500 text-white rounded-full">
                {selectedFilters.length}
              </span>
            )}
          </button>
          
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search payments by plan, description, or status..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 bg-white dark:bg-slate-700 focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500 focus:border-theme-primary-500 transition-all duration-200"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Filters */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Payment Status
              </h4>
              <div className="space-y-2">
                {statusFilters.map((filter) => (
                  <label key={filter.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedFilters.includes(filter.value)}
                      onChange={() => handleFilterToggle(filter.value)}
                      className="w-4 h-4 text-theme-primary-600 border-slate-300 dark:border-slate-600 rounded-sm focus:ring-theme-primary-500 focus:ring-2 bg-white dark:bg-slate-700"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      {filter.label}
                    </span>
                    {filter.count !== undefined && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-full">
                        {filter.count}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Advanced Filters */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Advanced Filters
              </h4>
              
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="w-full text-left p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Date Range & Amount</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Coming Soon</span>
                </div>
              </button>
              
              {showAdvancedFilters && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Advanced filtering options including date ranges, amount ranges, and sorting will be available in the next update.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Filter Actions */}
          {hasActiveFilters && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Active filters:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-primary-100 dark:bg-theme-primary-900/20 text-theme-primary-700 dark:text-theme-primary-300 text-xs font-medium rounded-full">
                      Search: &quot;{searchTerm}&quot;
                      <button
                        onClick={() => onSearchChange('')}
                        className="ml-1 hover:text-theme-primary-800 dark:hover:text-theme-primary-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedFilters.map((filter) => (
                    <span key={filter} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full">
                      {filter}
                      <button
                        onClick={() => handleFilterToggle(filter)}
                        className="ml-1 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span>Quick actions:</span>
            <button className="inline-flex items-center gap-1 text-theme-primary-600 dark:text-theme-primary-400 hover:text-theme-primary-700 dark:hover:text-theme-primary-300 font-medium underline">
              <Download className="w-3 h-3" />
              Export Results
            </button>
            <button className="inline-flex items-center gap-1 text-theme-primary-600 dark:text-theme-primary-400 hover:text-theme-primary-700 dark:hover:text-theme-primary-300 font-medium underline">
              <Calendar className="w-3 h-3" />
              Date Range
            </button>
          </div>
          
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
