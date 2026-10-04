import { ArrowLeft, CalendarDays, CreditCard, FileLock2, Pencil, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { submitOfferAction } from "@/features/offers/actions";
import { StatusBadge } from "@/features/offers/components/status-badge";
import { getPrivateOffer } from "@/features/offers/data";
import { offerIdSchema } from "@/features/offers/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Offer details" };

export default async function OfferDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submission?: string }>;
}) {
  const { id } = await params;
  if (!offerIdSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const offer = await getPrivateOffer(supabase, user.id, id);
  if (!offer) notFound();
  const { submission } = await searchParams;
  const editable = offer.verificationStatus === "DRAFT" || offer.verificationStatus === "NEEDS_REVIEW";
  const submit = submitOfferAction.bind(null, offer.id);

  return (
    <div className="space-y-8">
      <Link href="/offers" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-4" /> My offers</Link>
      {submission === "success" ? <p className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">Offer submitted for verification.</p> : null}
      {submission === "error" ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">Submission failed. Confirm the offer is unexpired and has private evidence.</p> : null}

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{offer.merchantName}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">{offer.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{offer.description || "No additional description."}</p>
          </div>
          <div className="flex flex-wrap gap-2"><StatusBadge status={offer.verificationStatus} /><StatusBadge status={offer.listingStatus} /></div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-muted/70 p-4"><p className="text-xs text-muted-foreground">Spend</p><p className="mt-2 font-semibold">${offer.spendRequirement.toLocaleString()}</p></div>
          <div className="rounded-2xl bg-muted/70 p-4"><p className="text-xs text-muted-foreground">Reward</p><p className="mt-2 font-semibold">{offer.rewardAmount.toLocaleString()} · {offer.rewardType.replaceAll("_", " ").toLowerCase()}</p></div>
          <div className="rounded-2xl bg-muted/70 p-4"><CalendarDays aria-hidden="true" className="size-4 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Expires</p><p className="mt-1 font-semibold">{offer.expirationDate}</p></div>
          <div className="rounded-2xl bg-muted/70 p-4"><CreditCard aria-hidden="true" className="size-4 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Private card</p><p className="mt-1 font-semibold">{offer.cardNickname}</p></div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="flex items-start gap-3"><FileLock2 aria-hidden="true" className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold">Private verification evidence</h2><p className="mt-1 text-sm text-muted-foreground">{offer.evidence ? `Evidence status: ${offer.evidence.status.toLowerCase().replaceAll("_", " ")}.` : "No evidence uploaded."}</p></div></div>
        {offer.evidence ? <Link href={`/offers/${offer.id}/evidence`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", className: "mt-5" })}>View my evidence</Link> : null}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        {editable ? <Link href={`/offers/${offer.id}/edit`} className={buttonVariants({ variant: "outline", size: "lg" })}><Pencil aria-hidden="true" /> Edit offer</Link> : null}
        {editable ? <form action={submit}><Button type="submit" size="lg" disabled={!offer.evidence}><Send aria-hidden="true" /> Submit for verification</Button></form> : null}
      </div>
    </div>
  );
}
