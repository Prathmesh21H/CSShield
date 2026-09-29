import type { ReactNode } from "react";
import type { UserRole } from "@/types/user";

interface RoleGateProps {
  role: UserRole;
  allow: UserRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Hides or swaps UI based on the signed-in user's role. This is a
 * presentation-layer convenience only — the real authorization check
 * must happen server-side in each Route Handler, since a client-side
 * gate can always be bypassed by a determined user.
 */
export function RoleGate({ role, allow, fallback = null, children }: RoleGateProps) {
  if (!allow.includes(role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}