import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav aria-label="Marketing navigation" className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={buttonVariants({ size: "sm", className: "hidden sm:inline-flex" })}
          >
            Get started
            <ArrowRight aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
