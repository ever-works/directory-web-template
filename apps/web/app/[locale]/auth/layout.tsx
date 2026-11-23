import type { Metadata } from 'next';

/**
 * Private, per-visitor pages: never indexed (Spec 062). Pages below can still
 * set their own `robots`; this is the default for the whole segment.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Per-visitor pages (sign-in, account, submissions, checkout...): always rendered per
// request, never cached. Public content pages under `[locale]` are cached (ISR) since
// Spec 061; this keeps this segment exactly as it was before that change.
export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
