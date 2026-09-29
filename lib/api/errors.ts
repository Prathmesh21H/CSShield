import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

/**
 * Consistent error envelope for every Route Handler in this project, per
 * the build prompt's error-handling rule. Never leaks raw internal error
 * objects/stack traces to the client — logs the real error server-side
 * and returns a clean, predictable shape.
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    { success: false, error: { code, message, details: details ?? {} } },
    { status: STATUS_BY_CODE[code] }
  );
}

export function logServerError(context: string, error: unknown) {
  // Centralized so it's trivial to swap in structured logging later
  // without touching every route.
  console.error(`[${context}]`, error instanceof Error ? error.stack ?? error.message : error);
}