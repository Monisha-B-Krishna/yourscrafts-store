"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrushIcon,
  DownloadIcon,
  LayoutDashboardIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBagIcon },
  { href: "/admin/products", label: "Products", icon: PackageIcon },
  { href: "/admin/artworks", label: "Artworks", icon: BrushIcon },
  { href: "/admin/deals", label: "Deals & coupons", icon: TagIcon },
  { href: "/admin/editions", label: "Editions", icon: SparklesIcon },
  { href: "/admin/customers", label: "Customers", icon: UsersIcon },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
  { href: "/admin/export", label: "Download data", icon: DownloadIcon },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-2 pb-1 lg:flex-col lg:gap-1">
        {LINKS.map(({ href, label, icon: Icon, ...rest }) => {
          const active = "exact" in rest ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-xl lg:py-2.5",
                  active ? "bg-ink text-cream" : "bg-white text-ink hover:bg-peach-soft lg:bg-transparent",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
