import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/db/roles';

/**
 * The live admin role of a user, read from the database with `isAdmin(userId)`.
 *
 * Not the session's `isAdmin` claim: `lib/auth/index.ts` sets it at sign-in and
 * it stays for the JWT's 30-day lifetime, so a user whose admin role was
 * removed still has it until the token expires. No user id, or a failed
 * lookup, counts as not admin.
 */
async function hasLiveAdminRole(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    return await isAdmin(userId);
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

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
 * Checks the live role with `isAdmin(userId)` from `@/lib/db/roles`, not
 * the `session.user.isAdmin` JWT claim (set at sign-in and sticky for the
 * JWT's 30-day lifetime), so a user whose admin role was revoked is
 * refused at once. A failed lookup is refused too. API routes use
 * `requireAdminSession()` from `@/lib/auth/admin-guard`, which answers
 * with a 401/403/500 response instead of a redirect.
 *
 * @returns Session object if user is admin
 * @throws Redirect to /admin/auth/signin if unauthenticated
 * @throws Redirect to /unauthorized if the user does not have the admin role
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

  if (!(await hasLiveAdminRole(session.user.id))) {
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
 * Same live `isAdmin(userId)` lookup as {@link requireAdmin}, not the
 * `session.user.isAdmin` JWT claim (set at sign-in, sticky for the
 * JWT's 30-day lifetime).
 *
 * @returns true if the user has the admin role now; false when signed
 * out, without a user id, or when the lookup fails
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
  return hasLiveAdminRole(session?.user?.id);
}
