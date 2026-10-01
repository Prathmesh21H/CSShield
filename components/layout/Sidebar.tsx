"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  SlidersHorizontal,
  ShieldCheck,
  MessageSquare,
  Settings,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/types/user";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  {
    href: "/company",
    label: "Company data",
    icon: Building2,
    roles: ["ciso", "analyst", "admin"],
  },
  {
    href: "/optimizer",
    label: "Optimizer",
    icon: SlidersHorizontal,
    roles: ["ciso", "admin"],
  },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/chat", label: "Ask CyRO", icon: MessageSquare },
  { href: "/admin", label: "Data sources", icon: Settings, roles: ["ciso", "admin"] },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="hidden w-56 shrink-0 border-r border-line bg-surface md:block">
      <div className="px-5 py-6">
        <span className="text-sm font-semibold tracking-tight text-ink">
          CyRO
        </span>
      </div>
      <nav className="flex flex-col gap-0.5 px-3">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent-soft text-accent font-medium"
                  : "text-ink-soft hover:bg-paper hover:text-ink"
              )}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}