import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/health — checks real Supabase connectivity, not just that the
 * process is running. Check this before every demo, per the deployment
 * checklist in the 5-day build plan.
 */
export async function GET() {
  const checks: Record<string, "ok" | "failed"> = {};

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("business_units").select("id").limit(1);
    checks.database = error ? "failed" : "ok";
  } catch {
    checks.database = "failed";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      service: "cyro-backend",
      version: "0.1.0",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}