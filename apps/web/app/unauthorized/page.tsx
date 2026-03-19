'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 dark:bg-red-500/10 rounded-full blur-xl"></div>
            <div className="relative bg-white dark:bg-gray-800 p-6 rounded-full shadow-lg">
              <ShieldAlert className="w-16 h-16 text-red-500" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
          Access Denied
        </h1>

        {/* Message */}
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          You don&apos;t have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-theme-primary-500 hover:bg-theme-primary-600 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </Link>

          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-500">
          Error Code: 403 - Forbidden
        </p>
      </div>
    </div>
  );
}
