'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { SessionProvider } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
	const { data: session, status } = useSession();
	const router = useRouter();
	const pathname = usePathname();
	const hasRedirectedRef = useRef(false);

	// Check if we're on an auth page (signin, signup, etc.)
	// Using includes with trailing slash prevents false positives like /admin/authenticate
	const isAuthPage = pathname?.includes('/admin/auth/');

	useEffect(() => {
		if (status === 'loading' || hasRedirectedRef.current) return;

			if (!session) {
				if (isAuthPage) return;
				console.log('No session, redirecting to signin');
				hasRedirectedRef.current = true;
				// Not authenticated, redirect to admin signin with callback URL
			router.replace(`/admin/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
			return;
		}

		// Check if user is admin
			if (!session.user?.isAdmin) {
				console.log('User not admin, redirecting to unauthorized');
				hasRedirectedRef.current = true;
				// Not admin, redirect to unauthorized (mirrors server-side requireAdmin)
				window.location.replace('/unauthorized');
				return;
			}

		console.log('User authenticated and is admin');

		// If on an auth page and user is admin, redirect to dashboard so they don't see signin page
		if (isAuthPage) {
			console.log('Authenticated admin on auth page, redirecting to dashboard');
			hasRedirectedRef.current = true;
			router.replace('/admin');
			return;
		}
	}, [session, status, router, isAuthPage, pathname]);

	// Show loading while checking auth
	// if (status === "loading") {
	//   return (
	//     <div className="min-h-screen bg-gray-100 dark:bg-white/3 flex items-center justify-center">
	//       <div className="text-center">
	//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
	//         <p className="text-gray-600 dark:text-gray-400">Loading admin panel...</p>
	//       </div>
	//     </div>
	//   );
	// }

	// Show loading while redirecting (but not on auth pages)
	if (!isAuthPage && (!session || !session.user?.isAdmin)) {
		return (
			<div className="min-h-screen bg-gray-100 dark:bg-white/3 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
				</div>
			</div>
		);
	}

	// User is authenticated and is admin
	// On auth pages, render children directly without admin layout wrapper
	if (isAuthPage) {
		return <>{children}</>;
	}

	return (
		<div className="min-h-screen bg-gray-100 dark:bg-white/3">
			<header className="p-4 bg-gray-800 text-white font-bold text-xl">Admin Panel</header>
			<main className="p-8">{children}</main>
		</div>
	);
}

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
	return (
		<SessionProvider>
			<AdminAuthGuard>{children}</AdminAuthGuard>
		</SessionProvider>
	);
}
