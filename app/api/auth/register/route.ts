import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, logServerError } from "@/lib/api/errors";
import type { UserRole } from "@/types/user";

const VALID_ROLES: UserRole[] = ["ciso", "analyst", "auditor", "admin"];

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; fullName?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const { email, password, fullName, role } = body;

  if (!email || !password) {
    return apiError("VALIDATION_ERROR", "Email and password are required.");
  }
  if (password.length < 8) {
    return apiError("VALIDATION_ERROR", "Password must be at least 8 characters.");
  }
  // Registration is open to any role except "admin" — admin accounts should
  // be provisioned deliberately (e.g. via the Supabase dashboard), not
  // self-service, so a stray public signup can't grant itself admin access.
  const safeRole: UserRole = VALID_ROLES.includes(role as UserRole) && role !== "admin"
    ? (role as UserRole)
    : "analyst";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName ?? null, role: safeRole },
    },
  });

  if (error) {
    return apiError("VALIDATION_ERROR", error.message);
  }

  try {
    return NextResponse.json({
      success: true,
      user: { id: data.user?.id, email: data.user?.email, role: safeRole },
    });
  } catch (err) {
    logServerError("auth/register", err);
    return apiError("INTERNAL_ERROR", "Something went wrong while creating your account.");
  }
}