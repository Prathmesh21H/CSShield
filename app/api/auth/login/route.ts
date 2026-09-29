import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, logServerError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const { email, password } = body;
  if (!email || !password) {
    return apiError("VALIDATION_ERROR", "Email and password are required.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase's own message is safe to relay here — it's a user-facing
    // "invalid credentials" style message, not an internal error.
    return apiError("UNAUTHORIZED", error.message);
  }

  try {
    return NextResponse.json({
      success: true,
      user: { id: data.user.id, email: data.user.email },
    });
  } catch (err) {
    logServerError("auth/login", err);
    return apiError("INTERNAL_ERROR", "Something went wrong while signing you in.");
  }
}