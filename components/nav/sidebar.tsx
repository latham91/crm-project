"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, UsersRound, Calendar, Shield } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresSuperAdmin?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Members",
    href: "/members",
    icon: Users,
  },
  {
    title: "Groups",
    href: "/groups",
    icon: UsersRound,
  },
  {
    title: "Meetings",
    href: "/meetings",
    icon: Calendar,
  },
  {
    title: "Admin",
    href: "/admin",
    icon: Shield,
    requiresSuperAdmin: true,
  },
];

interface SidebarProps {
  userRole: "SUPER_ADMIN" | "ADMIN";
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter((item) => !item.requiresSuperAdmin || userRole === "SUPER_ADMIN");

  return (
    <div className="flex h-full w-16 lg:w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-center lg:justify-start lg:px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-base font-semibold text-gray-900">CRM</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 lg:px-4 py-4 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center lg:justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={item.title}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
