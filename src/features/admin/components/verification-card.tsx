import { BadgeCheck, CalendarDays, FileLock2, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { reviewOfferListingAction } from "@/features/admin/actions";
import type { AdminVerificationDTO, ReviewDecision } from "@/features/admin/types";

function ReviewButton({ listingId, decision, children, variant = "outline" }: {
  listingId: string;
  decision: ReviewDecision;
  children: React.ReactNode;
  variant?: "default" | "outline";
}) {
  const action = reviewOfferListingAction.bind(null, listingId, decision);
  return <form action={action}><Button type="submit" variant={variant} className="w-full sm:w-auto">{children}</Button></form>;
}

export function VerificationCard({ verification }: { verification: AdminVerificationDTO }) {
  return <article className="rounded-3xl border border-border bg-card p-5 sm:p-7">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{verification.merchantName}</p>
        <h2 className="mt-2 text-xl font-semibold">{verification.offerTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{verification.offerDescription || "No canonical description."}</p>
      </div>
      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">Pending review</span>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
      <div className="rounded-2xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Canonical spend</p><p className="mt-1 font-semibold">USD {verification.requiredSpend.toLocaleString()}</p></div>
      <div className="rounded-2xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Reward</p><p className="mt-1 font-semibold">{verification.rewardAmount.toLocaleString()} · {verification.rewardType.replaceAll("_", " ").toLowerCase()}</p></div>
      <div className="rounded-2xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Listing min spend</p><p className="mt-1 font-semibold">USD {verification.minSpend.toLocaleString()}</p></div>
      <div className="rounded-2xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Ask</p><p className="mt-1 font-semibold">USD {verification.askAmount.toLocaleString()}{verification.isObo ? " OBO" : " fixed"}</p></div>
      <div className="rounded-2xl bg-muted/70 p-3"><CalendarDays aria-hidden="true" className="size-4 text-primary" /><p className="mt-1 text-xs text-muted-foreground">Expires</p><p className="mt-1 font-semibold">{verification.expirationDate}</p></div>
    </div>
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-semibold">{verification.sellerUsername}</p><p className="mt-1 text-xs text-muted-foreground">Evidence status: {verification.evidenceStatus.toLowerCase().replaceAll("_", " ")}</p></div>
      <Link href={"/admin/verifications/" + verification.listingId + "/evidence"} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}><FileLock2 aria-hidden="true" /> View private evidence</Link>
    </div>
    <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
      <ReviewButton listingId={verification.listingId} decision="APPROVE" variant="default"><BadgeCheck aria-hidden="true" /> Approve and publish</ReviewButton>
      <ReviewButton listingId={verification.listingId} decision="NEEDS_REVIEW"><RotateCcw aria-hidden="true" /> Needs review</ReviewButton>
      <ReviewButton listingId={verification.listingId} decision="REJECT"><XCircle aria-hidden="true" /> Reject</ReviewButton>
    </div>
  </article>;
}
