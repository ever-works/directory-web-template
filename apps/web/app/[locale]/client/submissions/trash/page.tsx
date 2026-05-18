import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TrashContent } from "./trash-content";

// Force dynamic rendering — page depends on session cookies (Spec 027).
export const dynamic = 'force-dynamic';

export default async function TrashPage() {
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <TrashContent />;
}
