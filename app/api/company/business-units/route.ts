import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { apiError, logServerError } from "@/lib/api/errors";
import { getServerSession } from "@/lib/auth/session";

export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from("business_units")
      .select("id, name, created_at")
      .order("name");

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    logServerError("company/business-units GET", err);
    return apiError("INTERNAL_ERROR", "Could not load business units.");
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerSession();
  if (!user) {
    return apiError("UNAUTHORIZED", "Sign in to add company data.");
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const name = body.name?.trim();
  if (!name) {
    return apiError("VALIDATION_ERROR", "name is required.");
  }

  const supabase = createServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from("business_units")
      .insert({ name })
      .select("id, name, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logServerError("company/business-units POST", err);
    return apiError("INTERNAL_ERROR", "Could not create the business unit.");
  }
}