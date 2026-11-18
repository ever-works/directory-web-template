// Per-visitor pages (sign-in, account, submissions, checkout...): always rendered per
// request, never cached. Public content pages under `[locale]` are cached (ISR) since
// Spec 061; this keeps this segment exactly as it was before that change.
export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
