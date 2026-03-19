import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TrashContent } from "./trash-content";

export default async function TrashPage() {
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <TrashContent />;
}
