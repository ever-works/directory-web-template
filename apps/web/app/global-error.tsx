'use client';
import Link from 'next/link';
import { Button } from '@heroui/react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
    <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <div className="mb-6">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Something went wrong!</h1>
          <div className="mb-6 max-w-lg mx-auto">
            <p className="text-gray-600 mb-4">
              We apologize for the inconvenience. Our team has been notified and is working to fix the issue.
            </p>
            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md text-left overflow-auto max-h-[200px] text-sm">
                <p className="font-semibold text-red-600">{error.message}</p>
                {error.stack && (
                  <pre className="mt-2 text-xs text-gray-700 overflow-auto">
                    {error.stack}
                  </pre>
                )}
                {error.digest && (
                  <p className="mt-2 text-xs text-gray-500">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <Button onPress={() => reset()} variant="solid">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link href="/" passHref>
              <Button variant="solid">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
