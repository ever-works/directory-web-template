import { getSessionViaApi } from "@/lib/auth/get-session-via-api";
import { redirect } from "next/navigation";
import { TrashContent } from "./trash-content";

// Force dynamic rendering — page depends on session cookies (Spec 027).
export const dynamic = 'force-dynamic';
// Force Node.js runtime so auth()'s DB/bcryptjs-backed JWT callbacks can run.
export const runtime = 'nodejs';

export default async function TrashPage() {
  const session = await getSessionViaApi();

  // Check if user is authenticated
  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <TrashContent />;
}
