'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { DashboardContent } from '@/components/dashboard';
import { useCurrentUser } from '@/hooks/use-current-user';

/**
 * Client-side auth gate for the dashboard. See spec-027:
 * server-side `auth()` returns null on this route despite the same cookie
 * resolving correctly on /api/auth/session and /api/current-user. We rely
 * on useSession (which hits /api/auth/session, the path that works) and
 * useCurrentUser (which hits /api/current-user) to gate access on the
 * client. When upstream Auth.js fixes the page-context `auth()` path,
 * this gate can be deleted and the page reverted to a Server Component
 * that calls `await auth()` directly.
 */
export function DashboardClientGate() {
	const { data: session, status } = useSession();
	const { user } = useCurrentUser();
	const router = useRouter();
	const locale = useLocale();

	const sessionUser = session?.user ?? null;
	const isAuthenticated = status === 'authenticated' || (status === 'loading' && !!sessionUser);

	useEffect(() => {
		if (status === 'loading') return;
		if (!sessionUser) {
			router.replace(`/${locale}/auth/signin`);
			return;
		}
		// Admin users belong on /admin, not /client/dashboard.
		if (sessionUser.isAdmin === true) {
			router.replace(`/${locale}/admin`);
		}
	}, [status, sessionUser, router, locale]);

	if (!isAuthenticated || !sessionUser) {
		// Loading or about to redirect — render nothing to avoid flashing
		// the wrong content.
		return null;
	}
	if (sessionUser.isAdmin === true) {
		return null;
	}

	// Build a Session-shaped object for DashboardContent. We prefer the
	// useSession payload (richer, has expires) and let DashboardContent's
	// child queries (/api/current-user, dashboard stats) do their own
	// authenticated fetches.
	return <DashboardContent session={session ?? null} profileUsername={user?.name ? user.name : null} />;
}
