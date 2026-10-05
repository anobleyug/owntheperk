import { CirclePlus, Clock3, CreditCard, FileCheck2, FilePenLine, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getPrivateCards } from "@/features/cards/data";
import { PrivateOfferCard } from "@/features/offers/components/private-offer-card";
import { getPrivateOffers } from "@/features/offers/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My offers" };

const FILTERS = ["ALL", "DRAFT", "PENDING", "VERIFIED", "EXPIRED"] as const;

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [allOffers, cards] = await Promise.all([
    getPrivateOffers(supabase, user.id),
    getPrivateCards(supabase, user.id),
  ]);
  const requestedStatus = (await searchParams).status ?? "ALL";
  const selectedStatus = FILTERS.includes(requestedStatus as (typeof FILTERS)[number])
    ? requestedStatus
    : "ALL";
  const offers =
    selectedStatus === "ALL"
      ? allOffers
      : allOffers.filter((offer) => offer.verificationStatus === selectedStatus);
  const offersByCard = Map.groupBy(offers, (offer) => offer.cardId);
  const stats = [
    { icon: CreditCard, label: "Active cards", value: cards.filter((card) => card.status === "ACTIVE").length },
    { icon: Tags, label: "Total offers", value: allOffers.length },
    { icon: FilePenLine, label: "Drafts", value: allOffers.filter((offer) => offer.verificationStatus === "DRAFT").length },
    { icon: Clock3, label: "Pending", value: allOffers.filter((offer) => offer.verificationStatus === "PENDING").length },
    { icon: FileCheck2, label: "Verified", value: allOffers.filter((offer) => offer.verificationStatus === "VERIFIED").length },
    { icon: Clock3, label: "Expired", value: allOffers.filter((offer) => offer.verificationStatus === "EXPIRED" || offer.listingStatus === "EXPIRED" || offer.expirationDate < new Date().toISOString().slice(0, 10)).length },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Private owner dashboard"
        title="My offers"
        description="Organize offers by private card profile and track evidence and verification status. These records are not publicly searchable."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/offers/cards" className={buttonVariants({ variant: "outline" })}><CreditCard aria-hidden="true" /> My cards</Link>
            <Link href="/offers/new" className={buttonVariants()}><CirclePlus aria-hidden="true" /> Add offer</Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <Icon aria-hidden="true" className="size-4 text-primary" />
            <p className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {allOffers.length ? (
        <section>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
            <h2 className="text-lg font-semibold">All private offers</h2>
            <p className="mt-1 text-sm text-muted-foreground">Card nicknames appear only in this owner-only dashboard.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter offers by verification status">
              {FILTERS.map((filter) => (
                <Link
                  key={filter}
                  href={filter === "ALL" ? "/offers" : `/offers?status=${filter}`}
                  className={`min-h-9 shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${selectedStatus === filter ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
                >
                  {filter === "ALL" ? "All" : filter.replaceAll("_", " ").toLowerCase()}
                </Link>
              ))}
            </div>
          </div>
          {offers.length ? (
            <div className="space-y-7">
              {Array.from(offersByCard.entries()).map(([cardId, cardOffers]) => (
                <section key={cardId} className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{cardOffers[0]?.cardNickname}</h3>
                      <p className="text-xs text-muted-foreground">Private card · {cardOffers.length} {cardOffers.length === 1 ? "offer" : "offers"}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {cardOffers.map((offer) => <PrivateOfferCard key={offer.id} offer={offer} />)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">No offers match this status.</p>
          )}
        </section>
      ) : (
        <EmptyState
          icon={Tags}
          title="No offers yet"
          description={cards.some((card) => card.status === "ACTIVE") ? "Create a draft offer and add private evidence when you are ready to submit it." : "Add a private card profile before creating your first offer."}
          action={
            <Link href={cards.length ? "/offers/new" : "/offers/cards"} className={buttonVariants({ variant: "outline" })}>
              {cards.length ? "Add offer" : "Add private card"}
            </Link>
          }
        />
      )}
    </div>
  );
}
