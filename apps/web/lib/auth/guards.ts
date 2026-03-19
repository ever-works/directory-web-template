import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

/**
 * Server-side authentication guard for pages
 * Requires user to be authenticated, redirects to signin if not
 *
 * @returns Session object if authenticated
 * @throws Redirect to /auth/signin if unauthenticated
 *
 * @example
 * ```tsx
 * export default async function ProtectedPage() {
 *   const session = await requireAuth();
 *   return <div>Welcome {session.user.email}</div>;
 * }
 * ```
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return session;
}

/**
 * Server-side admin authorization guard for pages
 * Requires user to be authenticated AND have admin role
 *
 * @returns Session object if user is admin
 * @throws Redirect to /admin/auth/signin if unauthenticated
 * @throws Redirect to /unauthorized if not admin
 *
 * @example
 * ```tsx
 * export default async function AdminPage() {
 *   const session = await requireAdmin();
 *   return <div>Admin: {session.user.email}</div>;
 * }
 * ```
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect('/admin/auth/signin');
  }

  if (!session.user.isAdmin) {
    redirect('/unauthorized');
  }

  return session;
}

/**
 * Get current session without redirecting
 * Useful for conditional rendering based on auth state
 *
 * @returns Session object or null if unauthenticated
 *
 * @example
 * ```tsx
 * export default async function Page() {
 *   const session = await getSession();
 *   if (session) {
 *     return <AuthenticatedView user={session.user} />;
 *   }
 *   return <GuestView />;
 * }
 * ```
 */
export async function getSession() {
  return await auth();
}

/**
 * Check if current user is admin without redirecting
 *
 * @returns true if user is admin, false otherwise
 *
 * @example
 * ```tsx
 * export default async function Page() {
 *   const isAdmin = await checkIsAdmin();
 *   return isAdmin ? <AdminContent /> : <UserContent />;
 * }
 * ```
 */
export async function checkIsAdmin() {
  const session = await auth();
  return session?.user?.isAdmin === true;
}
