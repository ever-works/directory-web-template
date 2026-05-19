import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/db/roles';
import { NotificationStreamProvider } from '@/components/notifications';

/**
 * Spec 027 — wraps all /client/** routes in a single SSE subscription
 * for the authenticated user.  Anonymous users render `children` but
 * the stream stays disabled (preserves existing redirect behaviour
 * from individual pages).  Admins are also excluded — their bell
 * lives in the admin layout and uses a separate API surface.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();
	const userId = session?.user?.id;
	const enabled = Boolean(userId) && !(userId && (await isAdmin(userId)));

	return <NotificationStreamProvider enabled={enabled}>{children}</NotificationStreamProvider>;
}
