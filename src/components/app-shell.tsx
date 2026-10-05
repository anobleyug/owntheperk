import { Bell, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DesktopNavigation, MobileNavigation } from "@/components/app-navigation";
import { Brand } from "@/components/brand";

function initialsFor(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export function AppShell({
  children,
  username,
  avatarUrl,
  unreadNotificationCount,
}: {
  children: ReactNode;
  username: string;
  avatarUrl: string | null;
  unreadNotificationCount: number;
}) {
  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh border-r border-border bg-card/65 p-5 lg:flex lg:flex-col">
        <Brand href="/search" />
        <DesktopNavigation unreadNotificationCount={unreadNotificationCount} />

        <div className="mt-auto rounded-2xl border border-border bg-background p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Privacy by default
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Public marketplace views never show card details or verification evidence.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Brand compact href="/search" className="lg:hidden" />
          <div className="hidden lg:block">
            <p className="text-xs font-semibold text-muted-foreground">Marketplace</p>
            <p className="text-sm font-semibold">Welcome back, {username}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary sm:inline-flex">
              Profile protected
            </span>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Bell aria-hidden="true" className="size-4.5" />
              {unreadNotificationCount > 0 && <span className="absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}
            </Link>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${username}'s avatar`}
                referrerPolicy="no-referrer"
                className="size-10 rounded-full bg-muted object-cover"
              />
            ) : (
              <span
                aria-label={`${username}'s avatar`}
                className="grid size-10 place-items-center rounded-full bg-brand-ink text-xs font-bold text-primary-foreground"
              >
                {initialsFor(username)}
              </span>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-7 pb-28 sm:px-6 sm:pt-9 lg:px-10 lg:pb-12">
          {children}
        </main>
      </div>

      <MobileNavigation />
    </div>
  );
}
