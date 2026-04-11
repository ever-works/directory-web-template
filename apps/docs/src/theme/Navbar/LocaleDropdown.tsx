import React, { useState, useRef, useEffect } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

const LanguageIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width={18}
    height={18}
    aria-hidden
    fill="currentColor"
  >
    <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    className="w-4 h-4 transition-transform"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

const LocaleDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    i18n: { defaultLocale, currentLocale, locales, localeConfigs },
  } = useDocusaurusContext();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const getLocaleLabel = (locale: string) => {
    return localeConfigs[locale]?.label || locale.toUpperCase();
  };

  // Derive the active locale directly from the browser URL so the indicator is
  // always correct — including on 404 pages where context may return the default locale.
  const activeLocale = (() => {
    if (typeof window === 'undefined') return currentLocale;
    const path = window.location.pathname;
    for (const loc of locales) {
      if (loc === defaultLocale) continue;
      const prefix = `/${loc}`;
      if (path === prefix || path.startsWith(`${prefix}/`)) return loc;
    }
    return defaultLocale;
  })();

  const buildLocaleUrl = (locale: string): string => {
    // Read the real browser path (not the internal router path, which may differ).
    const realPath = typeof window !== 'undefined' ? window.location.pathname : '/';

    // Iteratively strip every leading locale prefix so stale URLs like
    // /bg/fr/page are fully cleaned to /page before the new prefix is added.
    const nonDefault = locales.filter((l) => l !== defaultLocale);
    let canonical = realPath;
    let peeled = true;
    while (peeled) {
      peeled = false;
      for (const loc of nonDefault) {
        const pfx = `/${loc}`;
        if (canonical === pfx) { canonical = '/'; peeled = true; break; }
        if (canonical.startsWith(`${pfx}/`)) { canonical = canonical.slice(pfx.length); peeled = true; break; }
      }
    }

    const targetPrefix = locale !== defaultLocale ? `/${locale}` : '';
    return (targetPrefix + canonical) || '/';
  };

  const switchLocale = (locale: string) => {
    setIsOpen(false);
    const targetUrl = buildLocaleUrl(locale);
    // Navigate to the target page. If it 404s (e.g. page not yet translated),
    // fall back to the locale root so the user never gets stuck on a 404.
    const fallbackUrl = locale !== defaultLocale ? `/${locale}/` : '/';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    fetch(targetUrl, { method: 'HEAD', signal: controller.signal })
      .then((res) => {
        clearTimeout(timeout);
        window.location.href = res.ok ? targetUrl : fallbackUrl;
      })
      .catch(() => {
        clearTimeout(timeout);
        window.location.href = fallbackUrl;
      });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg border border-gray-200/80 dark:border-zinc-700/80 bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800 backdrop-blur-sm transition-all duration-200"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <LanguageIcon />
        <span className="hidden md:inline">{activeLocale.toUpperCase()}</span>
        <ChevronDownIcon />
      </button>

       {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 p-1.5 min-w-[160px] max-h-[300px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700/40 bg-white dark:bg-black shadow-lg animate-fade-in z-[200]">
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => switchLocale(locale)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 mb-px text-sm rounded-md transition-colors duration-150 ${
                locale === activeLocale
                  ? "bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="flex-1 text-left">{getLocaleLabel(locale)}</span>
              {locale === activeLocale && (
                <svg
                  className="w-3 h-3 text-gray-500 dark:text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocaleDropdown;
