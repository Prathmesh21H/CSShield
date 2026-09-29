// import { createClient } from "@/lib/supabase/server";
// import type { AppUser, UserRole } from "@/types/user";

// /**
//  * Reads the current Supabase auth session on the server and shapes it
//  * into the app's AppUser type, pulling the role from user_metadata
//  * (set at registration — see app/api/auth/register/route.ts).
//  *
//  * Returns null when there is no authenticated session; callers decide
//  * whether that means "redirect to /login" or "render a logged-out view".
//  */
// export async function getServerSession(): Promise<AppUser | null> {
//   const supabase = await createClient();
//   const {
//     data: { user },
//     error,
//   } = await supabase.auth.getUser();

//   if (error || !user) {
//     return null;
//   }

//   const role = (user.user_metadata?.role as UserRole | undefined) ?? "analyst";

//   return {
//     id: user.id,
//     email: user.email ?? "",
//     fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
//     role,
//   };
// }

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { apiError } from "@/lib/api/errors";

export async function GET() {
  const user = await getServerSession();

  if (!user) {
    return apiError("UNAUTHORIZED", "No active session.");
  }

  return NextResponse.json({ success: true, user });
}