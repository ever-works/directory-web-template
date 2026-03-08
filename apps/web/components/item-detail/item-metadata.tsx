interface ItemMetadataProps {
  category: string;
  categoryName: string;
  updatedAt?: string;
  sourceUrl?: string;
}

export function ItemMetadata({
  categoryName,
  updatedAt,
  sourceUrl,
}: ItemMetadataProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-6">
      <div className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-white/10 text-white backdrop-blur-xs">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 mr-2 opacity-70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        {categoryName}
      </div>

      {updatedAt && (
        <div className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-white/10 text-white backdrop-blur-xs dark:bg-dark--theme-800/30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 mr-2 opacity-70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {new Date(updatedAt).toLocaleDateString('en-US')}
        </div>
      )}

      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-primary-700 hover:bg-primary-600 text-white transition-all duration-300 shadow-xs hover:shadow-md dark:bg-primary-800 dark:hover:bg-primary-700 dark:shadow-primary-900/20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          View Source
        </a>
      )}
    </div>
  );
}
