import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";

/**
 * Entry point. Real auth check happens server-side via Supabase session —
 * no client-side flash of the wrong screen.
 */
export default async function RootPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  redirect("/login");
}