'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900! dark:via-gray-800! dark:to-gray-900!">
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
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
            Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
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
            Go Back
          </Button>
          
          <Button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-white"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>

        {/* Search Suggestion */}
        <div className="mt-12 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Try searching instead
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use the search bar above to find what you&apos;re looking for.
          </p>
        </div>

        {/* Helpful Links */}
        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>
            Need help?{' '}
            <button
              onClick={() => router.push('/help')}
              className="text-theme-primary hover:text-theme-accent transition-colors underline"
            >
              Contact Support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
