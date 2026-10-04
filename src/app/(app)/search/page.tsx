import { Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Marketplace"
        title="Find an offer"
        description="Public marketplace search will open only after the sanitized verified-offer view and admin verification workflow are complete."
      />
      <EmptyState
        icon={Search}
        title="Marketplace offers are not public yet"
        description="Phase 3 keeps every offer private to its owner while evidence is collected and submitted for later review."
        action={
          <div className="flex flex-col items-center gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
              <ShieldCheck aria-hidden="true" className="size-4" /> Privacy boundary active
            </span>
            <Link href="/offers" className={buttonVariants({ variant: "outline" })}>Manage my private offers</Link>
          </div>
        }
      />
    </div>
  );
}
