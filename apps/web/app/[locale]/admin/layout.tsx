import AdminLayoutClient from "./layout-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Auth check handled by AdminLayoutClient (client-side)
  // Client-side guard already handles /admin/auth/* exclusion
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
