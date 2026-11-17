import AdminLayoutClient from "./layout-client";

// Per-visitor pages: always rendered per request, never cached. Public content pages
// under `[locale]` are cached (ISR) since Spec 061; this keeps this segment as it was.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Auth check handled by AdminLayoutClient (client-side)
  // Client-side guard already handles /admin/auth/* exclusion
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
