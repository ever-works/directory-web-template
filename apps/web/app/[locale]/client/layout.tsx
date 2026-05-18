import { auth } from '@/lib/auth';
import { NotificationStreamProvider } from '@/components/notifications';

/**
 * Spec 027 — wraps all /client/** routes in a single SSE subscription
 * for the authenticated user. When the user is anonymous we still
 * render `children` but the stream stays disabled (preserves existing
 * redirect behaviour from individual pages).
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();
	const enabled = Boolean(session?.user?.id);

	return <NotificationStreamProvider enabled={enabled}>{children}</NotificationStreamProvider>;
}
