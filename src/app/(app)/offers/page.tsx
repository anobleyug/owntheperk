import { CirclePlus, Clock3, CreditCard, FileCheck2, FilePenLine, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getPrivateCards } from "@/features/cards/data";
import { PrivateOfferListingCard } from "@/features/offers/components/private-offer-listing-card";
import { getPrivateOfferListings } from "@/features/offers/data";
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

  const [allListings, cards] = await Promise.all([
    getPrivateOfferListings(supabase, user.id),
    getPrivateCards(supabase, user.id),
  ]);
  const requestedStatus = (await searchParams).status ?? "ALL";
  const selectedStatus = FILTERS.includes(requestedStatus as (typeof FILTERS)[number])
    ? requestedStatus
    : "ALL";
  const listings =
    selectedStatus === "ALL"
      ? allListings
      : allListings.filter((listing) => listing.verificationStatus === selectedStatus);
  const listingsByCard = Map.groupBy(listings, (listing) => listing.cardId);
  const stats = [
    { icon: CreditCard, label: "Active cards", value: cards.filter((card) => card.status === "ACTIVE").length },
    { icon: Tags, label: "Total listings", value: allListings.length },
    { icon: FilePenLine, label: "Drafts", value: allListings.filter((listing) => listing.verificationStatus === "DRAFT").length },
    { icon: Clock3, label: "Pending", value: allListings.filter((listing) => listing.verificationStatus === "PENDING").length },
    { icon: FileCheck2, label: "Verified", value: allListings.filter((listing) => listing.verificationStatus === "VERIFIED").length },
    { icon: Clock3, label: "Expired", value: allListings.filter((listing) => listing.verificationStatus === "EXPIRED" || listing.listingStatus === "EXPIRED" || listing.expirationDate < new Date().toISOString().slice(0, 10)).length },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Private owner dashboard"
        title="My offers"
        description="Manage your cardholder listings around shared credit card offers. These records are not publicly searchable yet."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/offers/cards" className={buttonVariants({ variant: "outline" })}><CreditCard aria-hidden="true" /> My cards</Link>
            <Link href="/offers/new" className={buttonVariants()}><CirclePlus aria-hidden="true" /> Add listing</Link>
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

      {allListings.length ? (
        <section>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
            <h2 className="text-lg font-semibold">All private listings</h2>
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
          {listings.length ? (
            <div className="space-y-7">
              {Array.from(listingsByCard.entries()).map(([cardId, cardListings]) => (
                <section key={cardId} className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{cardListings[0]?.cardNickname}</h3>
                      <p className="text-xs text-muted-foreground">Private card · {cardListings.length} {cardListings.length === 1 ? "listing" : "listings"}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {cardListings.map((listing) => <PrivateOfferListingCard key={listing.id} listing={listing} />)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">No listings match this status.</p>
          )}
        </section>
      ) : (
        <EmptyState
          icon={Tags}
          title="No listings yet"
          description={cards.some((card) => card.status === "ACTIVE") ? "Create a listing for a shared offer and add private evidence when you are ready to submit it." : "Add a private card profile before creating your first listing."}
          action={
            <Link href={cards.length ? "/offers/new" : "/offers/cards"} className={buttonVariants({ variant: "outline" })}>
              {cards.length ? "Add listing" : "Add private card"}
            </Link>
          }
        />
      )}
    </div>
  );
}
