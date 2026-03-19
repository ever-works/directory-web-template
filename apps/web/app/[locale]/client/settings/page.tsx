import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsContent } from "./settings-content";

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
