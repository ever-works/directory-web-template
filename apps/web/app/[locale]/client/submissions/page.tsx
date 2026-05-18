import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SubmissionsContent } from "./submissions-content";

// Force dynamic rendering — page depends on session cookies (Spec 027).
export const dynamic = 'force-dynamic';
// Force Node.js runtime so auth()'s DB/bcryptjs-backed JWT callbacks can run.
export const runtime = 'nodejs';

export default async function SubmissionsPage() {
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <SubmissionsContent />;
}
