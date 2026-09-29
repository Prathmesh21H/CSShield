export type UserRole = "ciso" | "analyst" | "auditor" | "admin";

export interface AppUser {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
}