import { BadgeCheck } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandProps = {
  className?: string;
  compact?: boolean;
  href?: string;
};

export function Brand({ className, compact = false, href = "/" }: BrandProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg font-semibold tracking-[-0.025em] outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-brand-ink text-primary-foreground shadow-sm">
        <BadgeCheck aria-hidden="true" className="size-5" strokeWidth={2.2} />
      </span>
      {!compact && <span className="text-lg">Own the Perk</span>}
    </Link>
  );
}
