import type { AppUser } from "@/types/user";
import { Badge } from "@/components/ui/Badge";

const ROLE_LABEL: Record<AppUser["role"], string> = {
  ciso: "CISO",
  analyst: "Security Analyst",
  auditor: "Auditor",
  admin: "Admin",
};

export function Navbar({ user }: { user: AppUser }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
      <div className="text-sm text-ink-soft">
        Continuous Cyber Risk &amp; Investment Optimization
      </div>
      <div className="flex items-center gap-3">
        <Badge tone="accent">{ROLE_LABEL[user.role]}</Badge>
        <span className="text-sm text-ink">
          {user.fullName ?? user.email}
        </span>
      </div>
    </header>
  );
}