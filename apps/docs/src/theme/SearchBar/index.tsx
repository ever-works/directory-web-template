import React, { useState, useEffect, useRef, useCallback, JSX } from "react";
import { useHistory } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useIsBrowser from "@docusaurus/useIsBrowser";

// Icons
const SearchIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DocIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ArrowIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

interface SearchResult {
  document: {
    u: string; // URL
    t: string; // Title
    h?: string; // Heading hash
    s?: string; // Snippet/content
  };
  tokens: string[];
}

export default function SearchBar(): JSX.Element {
  const isBrowser = useIsBrowser();
  const history = useHistory();
  const {
    siteConfig: { baseUrl },
    i18n: { currentLocale, defaultLocale },
  } = useDocusaurusContext();

  // Compute the locale-aware base URL for search index loading
  // For non-default locales, prepend the locale path (e.g., "/fr/")
  const searchBaseUrl =
    currentLocale !== defaultLocale ? `${baseUrl}${currentLocale}/` : baseUrl;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [indexLoading, setIndexLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Detect macOS for keyboard shortcut hint
  const isMac = isBrowser
    ? /mac/i.test(
        (navigator as any).userAgentData?.platform ?? navigator.platform,
      )
    : false;

  // Open modal
  const openModal = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  // Load search index
  const loadIndex = useCallback(async () => {
    if (indexLoaded || indexLoading || !isBrowser) return;

    try {
      setIndexLoading(true);
      setError(null);
      console.log("Loading search index with baseUrl:", searchBaseUrl);
      // Dynamically import the search worker functions
      const { fetchIndexesByWorker } =
        await import("@easyops-cn/docusaurus-search-local/dist/client/client/theme/searchByWorker");
      // Use searchBaseUrl to load the correct locale-specific search index
      await fetchIndexesByWorker(searchBaseUrl, "");
      console.log("Search index loaded successfully");
      setIndexLoaded(true);
    } catch (err) {
      console.error("Failed to load search index:", err);
      setError("Failed to load search index. Please try rebuilding the site.");
    } finally {
      setIndexLoading(false);
    }
  }, [searchBaseUrl, indexLoaded, indexLoading, isBrowser]);

  // Perform search
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || !isBrowser) {
        setResults([]);
        return;
      }

      // Wait for index to be loaded before searching
      if (!indexLoaded) {
        // Index not ready yet - search will be triggered again when index loads
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log(
          "Searching with baseUrl:",
          searchBaseUrl,
          "query:",
          searchQuery,
          "indexLoaded:",
          indexLoaded,
        );
        const { searchByWorker } =
          (await import("@easyops-cn/docusaurus-search-local/dist/client/client/theme/searchByWorker")) as {
            searchByWorker: (
              baseUrl: string,
              searchContext: string,
              input: string,
              limit: number,
            ) => Promise<SearchResult[]>;
          };

        // Use searchBaseUrl to search the correct locale-specific index
        // The limit parameter (8) is required - it specifies max number of results
        const searchResults = await searchByWorker(
          searchBaseUrl,
          "",
          searchQuery,
          8, // searchResultLimits - max number of search results
        );
        console.log("Search results:", searchResults);

        setResults(searchResults || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search error:", err);
        setError("Search failed. Please try again.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchBaseUrl, isBrowser, indexLoaded],
  );

  // Debounced search - also triggers when index finishes loading
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    // If index is not loaded yet, don't set up the timer
    if (!indexLoaded) {
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, performSearch, indexLoaded]);

  // Navigate to result
  const navigateToResult = useCallback(
    (result: SearchResult) => {
      let url = result.document.u;
      if (result.document.h) {
        url += result.document.h;
      }
      closeModal();
      history.push(url);
    },
    [closeModal, history],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            navigateToResult(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeModal();
          break;
      }
    },
    [results, selectedIndex, navigateToResult, closeModal],
  );

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    if (!isBrowser) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((isMac ? e.metaKey : e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (isOpen) {
          closeModal();
        } else {
          openModal();
          loadIndex();
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isBrowser, isMac, isOpen, closeModal, openModal, loadIndex]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      loadIndex();
    }
  }, [isOpen, loadIndex]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeModal();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, closeModal]);

  return (
    <>
      {/* ── Search Trigger Button ── */}
      <button
        onClick={() => { openModal(); loadIndex(); }}
        className="group flex items-center gap-2 h-8 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-gray-400 dark:text-zinc-500 hover:border-gray-300 dark:hover:border-white/[0.14] hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:text-gray-600 dark:hover:text-zinc-400 transition-all duration-150 min-w-[160px] shadow-sm"
        aria-label="Search documentation"
      >
        <SearchIcon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left text-[12.5px] font-normal leading-none">Search…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-medium text-gray-400 dark:text-zinc-600 bg-gray-100 dark:bg-white/[0.05] rounded border border-gray-200 dark:border-white/[0.07] leading-none">
          {isMac ? "⌘" : "Ctrl"}K
        </kbd>
      </button>

      {/* ── Search Modal ── */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4 animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/65 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal card */}
          <div
            ref={modalRef}
            role="dialog"
            aria-label="Search"
            aria-modal="true"
            className="relative w-full max-w-[560px] bg-white dark:bg-[#0a0a0a] rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.7)] border border-gray-200 dark:border-white/[0.07] overflow-hidden animate-slide-up"
            onKeyDown={handleKeyDown}
          >
            {/* Input row */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-white/[0.07]">
              <SearchIcon className="w-4 h-4 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documentation…"
                className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 outline-none leading-none"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <div className="flex items-center gap-1.5">
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors rounded"
                    aria-label="Clear search"
                  >
                    <CloseIcon />
                  </button>
                )}
                <kbd
                  onClick={closeModal}
                  className="cursor-pointer px-1.5 py-0.5 text-[11px] font-medium text-gray-400 dark:text-zinc-600 bg-gray-100 dark:bg-white/[0.05] rounded border border-gray-200 dark:border-white/[0.07] hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
                >
                  Esc
                </kbd>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto scrollbar-soft">

              {/* Error */}
              {error && (
                <div className="flex flex-col items-center gap-2 py-10 text-sm text-red-500 dark:text-red-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p>{error}</p>
                </div>
              )}

              {/* Loading */}
              {!error && (isLoading || indexLoading) && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <div className="w-5 h-5 border-2 border-gray-200 dark:border-white/[0.1] border-t-gray-500 dark:border-t-zinc-400 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400 dark:text-zinc-500">
                    {indexLoading ? "Loading search index…" : "Searching…"}
                  </p>
                </div>
              )}

              {/* No results */}
              {!error && !isLoading && !indexLoading && results.length === 0 && query && indexLoaded && (
                <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-400 dark:text-zinc-500">
                  <SearchIcon className="w-5 h-5" />
                  <p>No results for <span className="font-medium text-gray-600 dark:text-zinc-300">&ldquo;{query}&rdquo;</span></p>
                  {process.env.NODE_ENV !== "production" && (
                    <p className="mt-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg text-amber-700 dark:text-amber-300 text-xs text-center">
                      Search only works in production — run{" "}
                      <code className="font-mono font-semibold">pnpm build && pnpm serve</code>
                    </p>
                  )}
                </div>
              )}

              {/* Empty prompt */}
              {!error && !isLoading && !indexLoading && results.length === 0 && !query && (
                <div className="flex flex-col items-center gap-3 py-10 text-sm text-gray-400 dark:text-zinc-500">
                  <p>Type to search across docs…</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-zinc-600">
                    {[
                      { keys: ["↑", "↓"], label: "Navigate" },
                      { keys: ["↵"], label: "Open" },
                      { keys: ["Esc"], label: "Close" },
                    ].map(({ keys, label }) => (
                      <span key={label} className="flex items-center gap-1">
                        {keys.map((k) => (
                          <kbd key={k} className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded text-[11px]">{k}</kbd>
                        ))}
                        <span>{label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {!isLoading && results.length > 0 && (
                <ul className="p-1.5">
                  {results.map((result, index) => {
                    const isActive = index === selectedIndex;
                    return (
                      <li key={`${result.document.u}-${index}`}>
                        <button
                          onClick={() => navigateToResult(result)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`group w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-100 ${
                            isActive
                              ? "bg-gray-100 dark:bg-white/[0.06]"
                              : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          {/* Icon */}
                          <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-md transition-colors ${
                            isActive
                              ? "bg-gray-200 dark:bg-white/[0.1] text-gray-700 dark:text-zinc-200"
                              : "bg-gray-100 dark:bg-white/[0.05] text-gray-400 dark:text-zinc-500"
                          }`}>
                            <DocIcon />
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-[13px] font-medium truncate leading-snug ${
                              isActive ? "text-gray-900 dark:text-zinc-100" : "text-gray-700 dark:text-zinc-300"
                            }`}>
                              {result.document.t}
                            </div>
                            {result.document.s && (
                              <div className="text-[12px] text-gray-400 dark:text-zinc-500 truncate mt-0.5 leading-snug">
                                {result.document.s}
                              </div>
                            )}
                          </div>

                          {/* Arrow indicator */}
                          {isActive && (
                            <div className="flex-shrink-0 mt-1 text-gray-400 dark:text-zinc-500">
                              <ArrowIcon />
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer hint bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-white/[0.07] bg-gray-50/80 dark:bg-white/[0.02]">
              <span className="text-[11px] text-gray-400 dark:text-zinc-600">
                {results.length > 0 && `${results.length} result${results.length !== 1 ? "s" : ""}`}
              </span>
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-600">
                Press{" "}
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.07] rounded">
                  {isMac ? "⌘" : "Ctrl"}K
                </kbd>{" "}
                to toggle
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
