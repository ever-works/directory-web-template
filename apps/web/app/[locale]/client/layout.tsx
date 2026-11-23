import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/db/roles';
import { NotificationStreamProvider } from '@/components/notifications';

/**
 * Private, per-visitor pages: never indexed (Spec 062). Pages below can still
 * set their own `robots`; this is the default for the whole segment.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };


/**
 * Spec 027 — wraps all /client/** routes in a single SSE subscription
 * for the authenticated user.  Anonymous users render `children` but
 * the stream stays disabled (preserves existing redirect behaviour
 * from individual pages).  Admins are also excluded — their bell
 * lives in the admin layout and uses a separate API surface.
 */
// Per-visitor pages: always rendered per request, never cached. Public content pages
// under `[locale]` are cached (ISR) since Spec 061; this keeps this segment as it was.
export const dynamic = 'force-dynamic';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();
	const userId = session?.user?.id;
	const enabled = Boolean(userId) && !(userId && (await isAdmin(userId)));

	return <NotificationStreamProvider enabled={enabled}>{children}</NotificationStreamProvider>;
}
