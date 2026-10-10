import { Bookmark, UserRound } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/profile/saved", label: "Saved", icon: Bookmark },
] as const;

export function ProfileTabs({ active }: { active: "profile" | "saved" }) {
  return <nav aria-label="Profile sections" className="flex gap-2 border-b border-border">
    {tabs.map(({ href, label, icon: Icon }) => {
      const selected = active === label.toLowerCase();
      return <Link key={href} href={href} aria-current={selected ? "page" : undefined} className={cn(
        "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold",
        selected ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
      )}><Icon aria-hidden="true" className="size-4" /> {label}</Link>;
    })}
  </nav>;
}
