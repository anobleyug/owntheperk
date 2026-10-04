import { CirclePlus, Clock3, FileCheck2, Tags } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

export default function OffersPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your listings"
        title="My offers"
        description="Organize offers by private card profile and track verification before publishing."
        action={
          <Link href="/offers/new" className={buttonVariants()}>
            <CirclePlus aria-hidden="true" />
            Add offer
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { icon: Tags, label: "Active", value: "0" },
          { icon: Clock3, label: "Pending", value: "0" },
          { icon: FileCheck2, label: "Verified", value: "0" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <Icon aria-hidden="true" className="size-4 text-primary" />
            <p className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <EmptyState
        icon={Tags}
        title="No offers yet"
        description="Card profiles and the private evidence workflow will be connected in a later phase. No card data is collected in this foundation."
        action={
          <Link href="/offers/new" className={buttonVariants({ variant: "outline" })}>
            Preview add offer
          </Link>
        }
      />
    </div>
  );
}
