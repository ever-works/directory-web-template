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
    <div className="bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/6 rounded-xl p-6 shadow-xs mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-100 dark:bg-white/8 rounded-lg flex items-center justify-center border border-neutral-200 dark:border-white/8">
            <Search className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Search & Filters</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {totalResults} result{totalResults !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              showFilters
                ? 'bg-neutral-100 dark:bg-white/8 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/8'
                : 'bg-neutral-100 dark:bg-white/4 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/6'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {selectedFilters.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-neutral-900 dark:bg-white dark:bg-white text-white rounded-full">
                {selectedFilters.length}
              </span>
            )}
          </button>
          
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-white/4 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/6 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-neutral-400" />
        </div>
        <input
          type="text"
          placeholder="Search payments by plan, description, or status..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-12 pr-4 py-3 border border-neutral-300 dark:border-white/8 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 bg-white dark:bg-white/8 focus:outline-hidden focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400 transition-all duration-200"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="border-t border-neutral-200 dark:border-white/6 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Filters */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                Payment Status
              </h4>
              <div className="space-y-2">
                {statusFilters.map((filter) => (
                  <label key={filter.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedFilters.includes(filter.value)}
                      onChange={() => handleFilterToggle(filter.value)}
                      className="w-4 h-4 text-neutral-500 border-neutral-300 dark:border-white/8 rounded-sm focus:ring-neutral-400 focus:ring-2 bg-white dark:bg-white/8"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                      {filter.label}
                    </span>
                    {filter.count !== undefined && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-neutral-100 dark:bg-white/4 text-neutral-600 dark:text-neutral-400 rounded-full">
                        {filter.count}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Advanced Filters */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                Advanced Filters
              </h4>
              
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="w-full text-left p-3 bg-neutral-50 dark:bg-white/4 border border-neutral-200 dark:border-white/6 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Date Range & Amount</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Coming Soon</span>
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
            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-white/6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Active filters:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-white/8 text-neutral-700 dark:text-neutral-300 text-xs font-medium rounded-full">
                      Search: &quot;{searchTerm}&quot;
                      <button
                        onClick={() => onSearchChange('')}
                        className="ml-1 hover:text-neutral-900 dark:hover:text-neutral-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedFilters.map((filter) => (
                    <span key={filter} className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-white/4 text-neutral-700 dark:text-neutral-300 text-xs font-medium rounded-full">
                      {filter}
                      <button
                        onClick={() => handleFilterToggle(filter)}
                        className="ml-1 hover:text-neutral-800 dark:hover:text-neutral-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-white/4 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/6 transition-colors"
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
      <div className="border-t border-neutral-200 dark:border-white/6 pt-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            <span>Quick actions:</span>
            <button className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium underline">
              <Download className="w-3 h-3" />
              Export Results
            </button>
            <button className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium underline">
              <Calendar className="w-3 h-3" />
              Date Range
            </button>
          </div>
          
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
