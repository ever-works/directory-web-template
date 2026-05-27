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
 * Server-side admin authorization guard for pages.
 *
 * **Heads-up on staleness vs `requireAdminSession`.** This helper
 * checks the `session.user.isAdmin` JWT claim that was set at sign-in
 * and is sticky for the JWT's lifetime (~30 days). A user whose admin
 * role was revoked TODAY still passes here until their JWT expires or
 * they sign out and back in. That's fine for casual UX gates (showing
 * an "Admin" nav link), but for **API authorisation decisions** prefer
 * `requireAdminSession()` from `@/lib/auth/admin-guard` — it does a
 * live `isAdmin(userId)` DB lookup per request (request-scoped
 * memoised) and reflects the current role state, not a 30-day-stale
 * claim.
 *
 * @returns Session object if user is admin
 * @throws Redirect to /admin/auth/signin if unauthenticated
 * @throws Redirect to /unauthorized if not admin (per the stale JWT claim)
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
 * Check if current user is admin without redirecting.
 *
 * Same JWT-claim staleness caveat as {@link requireAdmin} — the
 * value comes from `session.user.isAdmin` (set at sign-in, sticky
 * for the JWT's lifetime). For authorisation decisions where the
 * live role state matters, use `useIsAdminLive` (client) or
 * `requireAdminSession()` from `@/lib/auth/admin-guard` (server).
 *
 * @returns true if user is admin (per the JWT claim), false otherwise
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
