"use client";

import {
  CirclePlus,
  Bell,
  MessageSquareText,
  Search,
  Tags,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigationItems: NavigationItem[] = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/offers", label: "My Offers", icon: Tags },
  { href: "/offers/new", label: "Add", icon: CirclePlus },
  { href: "/messages", label: "Messages", icon: MessageSquareText },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/offers") {
    return pathname === href || (pathname.startsWith("/offers/") && !pathname.startsWith("/offers/new"));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNavigation({ unreadNotificationCount }: { unreadNotificationCount: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="mt-8 space-y-1">
      {navigationItems.map(({ href, icon: Icon, label }) => {
        const active = isItemActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </Link>
        );
      })}
      <Link href="/notifications" aria-current={isItemActive(pathname, "/notifications") ? "page" : undefined} className={cn(
        "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isItemActive(pathname, "/notifications") ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}>
        <Bell aria-hidden="true" className="size-5" />
        <span>Notifications</span>
        {unreadNotificationCount > 0 && <span className="ml-auto grid min-w-6 place-items-center rounded-full bg-primary px-1.5 py-1 text-xs font-bold text-primary-foreground">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}
      </Link>
    </nav>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/94 px-2 pt-1.5 backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {navigationItems.map(({ href, icon: Icon, label }) => {
          const active = isItemActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn("size-5", active && "fill-secondary")}
                strokeWidth={active ? 2.3 : 1.8}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
