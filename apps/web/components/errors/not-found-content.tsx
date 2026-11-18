'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getPathname } from '@/i18n/navigation';

type NotFoundText = Record<
  | 'PAGE_NOT_FOUND'
  | 'PAGE_NOT_FOUND_DESCRIPTION'
  | 'GO_BACK'
  | 'BACK_TO_HOME'
  | 'TRY_SEARCHING'
  | 'SEARCH_SUGGESTION'
  | 'NEED_HELP'
  | 'CONTACT_SUPPORT',
  string
>;

/** The global 404 renders outside `[locale]`, where no message provider exists. */
const ENGLISH: NotFoundText = {
  PAGE_NOT_FOUND: 'Page Not Found',
  PAGE_NOT_FOUND_DESCRIPTION: "Sorry, the page you're looking for doesn't exist or has been moved.",
  GO_BACK: 'Go Back',
  BACK_TO_HOME: 'Back to Home',
  TRY_SEARCHING: 'Try searching instead',
  SEARCH_SUGGESTION: "Use the search bar above to find what you're looking for.",
  NEED_HELP: 'Need help?',
  CONTACT_SUPPORT: 'Contact Support'
};

/**
 * @param locale The page's locale, inside `[locale]`: the text comes from that locale's
 *               `help` messages and the links keep it. Without it (the global 404, outside
 *               any locale and its message provider) the text is English and the links go
 *               to the default locale.
 */
export default function NotFound({ locale }: { locale?: string } = {}) {
  return locale ? <LocalizedNotFound locale={locale} /> : <NotFoundView text={ENGLISH} />;
}

function LocalizedNotFound({ locale }: { locale: string }) {
  const t = useTranslations('help');
  const text = Object.fromEntries(Object.keys(ENGLISH).map((key) => [key, t(key)])) as NotFoundText;
  return <NotFoundView locale={locale} text={text} />;
}

function NotFoundView({ locale, text }: { locale?: string; text: NotFoundText }) {
  const router = useRouter();
  const homeHref = locale ? getPathname({ href: '/', locale }) : '/';
  const helpHref = locale ? getPathname({ href: '/help', locale }) : '/help';

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-[#0a0a0a]! dark:via-[#0a0a0a]! dark:to-[#0a0a0a]!">
      <div className="text-center px-6 py-12 max-w-md mx-auto">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-bold bg-linear-to-r from-theme-primary-600 to-theme-accent-600 bg-clip-text text-transparent">
            404
          </h1>
        </div>

        {/* Main Message */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-4">
            {text.PAGE_NOT_FOUND}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
            {text.PAGE_NOT_FOUND_DESCRIPTION}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="flex items-center gap-2 px-6 py-3"
          >
            <ArrowLeft className="w-4 h-4" />
            {text.GO_BACK}
          </Button>
          
          <Button
            onClick={() => router.push(homeHref)}
            className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-white"
          >
            <Home className="w-4 h-4" />
            {text.BACK_TO_HOME}
          </Button>
        </div>

        {/* Search Suggestion: only inside a locale, where the site header (and its search
            bar) is rendered; the global 404 has no header. */}
        {locale ? (
          <div className="mt-12 p-4 bg-white/50 dark:bg-white/3 rounded-lg border border-gray-200/50 dark:border-white/4">
            <div className="flex items-center gap-3 mb-3">
              <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {text.TRY_SEARCHING}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{text.SEARCH_SUGGESTION}</p>
          </div>
        ) : null}

        {/* Helpful Links */}
        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>
            {text.NEED_HELP}{' '}
            <button
              onClick={() => router.push(helpHref)}
              className="text-theme-primary hover:text-theme-accent transition-colors underline"
            >
              {text.CONTACT_SUPPORT}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
