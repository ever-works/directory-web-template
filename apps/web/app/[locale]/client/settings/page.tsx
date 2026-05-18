import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsContent } from "./settings-content";

// Force dynamic rendering — page depends on session cookies (Spec 027).
export const dynamic = 'force-dynamic';
// Force Node.js runtime so auth()'s DB/bcryptjs-backed JWT callbacks can run.
export const runtime = 'nodejs';

export default async function ClientSettingsPage() {
  const session = await auth();
  
  // Check if user is authenticated
  if (!session?.user) {
    redirect('/auth/signin');
  }
  
  // Check if user is admin - redirect to admin dashboard
  if (session.user.isAdmin) {
    redirect('/admin');
  }
  
  return <SettingsContent />;
}
