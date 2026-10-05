import { CalendarDays, CreditCard } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/features/offers/components/status-badge";
import type { PrivateOfferDTO } from "@/features/offers/types";

function rewardLabel(offer: PrivateOfferDTO) {
  const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(offer.rewardAmount);
  if (offer.rewardType === "PERCENT_BACK") return `${amount}% back`;
  if (offer.rewardType === "POINTS") return `${amount} points`;
  return `$${amount} ${offer.rewardType === "STATEMENT_CREDIT" ? "credit" : "back"}`;
}

export function PrivateOfferCard({ offer }: { offer: PrivateOfferDTO }) {
  return (
    <Link
      href={`/offers/${offer.id}`}
      className="block rounded-3xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">{offer.merchantName}</p>
          <h3 className="mt-2 font-semibold leading-6">{offer.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={offer.verificationStatus} />
          <StatusBadge status={offer.listingStatus} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-muted/70 p-3">
          <p className="text-xs text-muted-foreground">Spend</p>
          <p className="mt-1 font-semibold">${offer.spendRequirement.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-muted/70 p-3">
          <p className="text-xs text-muted-foreground">Reward</p>
          <p className="mt-1 font-semibold">{rewardLabel(offer)}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><CreditCard aria-hidden="true" className="size-3.5" />{offer.cardNickname}</span>
        <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="size-3.5" />Expires {offer.expirationDate}</span>
      </div>
    </Link>
  );
}
