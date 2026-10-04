import { Search, SlidersHorizontal } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { OfferPreviewCard } from "@/features/marketplace/components/offer-preview-card";

const previewOffers = [
  {
    merchant: "Adobe",
    spend: "$600",
    reward: "$250 credit",
    expires: "Dec 31",
    username: "DealPilot82",
    rating: "4.9",
    interactions: 31,
    tone: "mint" as const,
  },
  {
    merchant: "Dell",
    spend: "$500",
    reward: "$100 credit",
    expires: "Nov 18",
    username: "PerkPath",
    rating: "4.8",
    interactions: 18,
    tone: "sky" as const,
  },
  {
    merchant: "Marriott",
    spend: "$300",
    reward: "$75 credit",
    expires: "Jan 12",
    username: "QuietSavings",
    rating: "5.0",
    interactions: 12,
    tone: "sand" as const,
  },
];

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Marketplace"
        title="Find an offer"
        description="Search by merchant and compare verified offer details with pseudonymous reputation."
      />

      <section aria-label="Offer search" className="rounded-3xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex gap-2">
          <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl bg-muted px-4 focus-within:ring-2 focus-within:ring-ring">
            <Search aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <span className="sr-only">Search merchants</span>
            <input
              type="search"
              placeholder="Search Adobe, Dell, Nike..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <Button type="button" variant="outline" size="icon" aria-label="Open filters">
            <SlidersHorizontal aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {["Verified only", "Highest reward", "Expiring soon", "Top rated"].map(
            (filter) => (
              <button
                key={filter}
                type="button"
                className="min-h-9 shrink-0 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                {filter}
              </button>
            ),
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.025em]">Recently active</h2>
            <p className="mt-1 text-xs text-muted-foreground">Illustrative listings for the UI foundation</p>
          </div>
          <span className="text-xs font-semibold text-primary">3 preview offers</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {previewOffers.map((offer) => (
            <OfferPreviewCard key={offer.merchant} {...offer} />
          ))}
        </div>
      </section>
    </div>
  );
}
