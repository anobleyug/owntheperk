import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ListingCard } from "@/features/marketplace/components/listing-card";
import { searchMarketplaceListings } from "@/features/marketplace/data";
import { formatReward } from "@/features/marketplace/format";
import { parseMarketplaceFilters } from "@/features/marketplace/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Search marketplace" };
const inputClass = "min-h-11 w-full rounded-2xl border border-input bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

function pageHref(params: Record<string, string | string[] | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (typeof value === "string" && value) query.set(key, value);
  query.set("page", String(page));
  return "/search?" + query.toString();
}

export default async function SearchPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const filters = parseMarketplaceFilters(rawParams);
  const supabase = await createClient();
  const { listings, total, pageSize } = await searchMarketplaceListings(supabase, filters);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const grouped = Map.groupBy(listings, (listing) => [
    listing.merchantSlug, listing.offerTitle, listing.rewardType, listing.rewardAmount,
    listing.canonicalSpendRequirement, listing.expirationDate,
  ].join("|"));

  return <div className="space-y-8">
    <PageHeader eyebrow="Verified marketplace" title="Find an offer listing" description="Compare independent cardholder listings by Ask, Min Spend, OBO, expiration, and pseudonymous reputation." />

    <form action="/search" className="rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-2"><SlidersHorizontal aria-hidden="true" className="size-5 text-primary" /><h2 className="font-semibold">Search and filters</h2></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Merchant
          <input name="q" type="search" defaultValue={filters.q} placeholder="Adobe, Nike, Marriott…" className={inputClass} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">Maximum ask
          <input name="maxAsk" type="number" min="0" step="0.01" defaultValue={filters.maxAsk} className={inputClass} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">Maximum min spend
          <input name="maxMinSpend" type="number" min="0" step="0.01" defaultValue={filters.maxMinSpend} className={inputClass} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">Minimum reward
          <input name="minReward" type="number" min="0" step="0.01" defaultValue={filters.minReward} className={inputClass} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">Expires on or after
          <input name="expiresAfter" type="date" defaultValue={filters.expiresAfter} className={inputClass} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">Minimum seller rating
          <select name="minRating" defaultValue={filters.minRating ?? ""} className={inputClass}>
            <option value="">Any rating</option><option value="3">3.0+</option><option value="4">4.0+</option><option value="4.5">4.5+</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold">Sort
          <select name="sort" defaultValue={filters.sort} className={inputClass}>
            <option value="newest">Newest</option><option value="lowest_ask">Lowest ask</option>
            <option value="highest_reward">Highest reward</option><option value="lowest_min_spend">Lowest min spend</option>
            <option value="highest_rated">Highest rated</option><option value="expiring_soon">Expiring soon</option>
          </select>
        </label>
      </div>
      <label className="mt-4 flex min-h-11 items-center gap-3 rounded-2xl border border-input px-4 text-sm font-semibold">
        <input name="obo" type="checkbox" value="true" defaultChecked={filters.oboOnly} className="size-5 accent-primary" /> OBO listings only
      </label>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="submit" className={buttonVariants()}><Search aria-hidden="true" /> Search marketplace</button>
        <Link href="/search" className={buttonVariants({ variant: "outline" })}>Clear filters</Link>
      </div>
    </form>

    <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">{total} verified {total === 1 ? "listing" : "listings"}</h2><p className="mt-1 text-sm text-muted-foreground">Grouped by merchant and credit card offer.</p></div></div>
    {listings.length ? <div className="space-y-8">
      {Array.from(grouped.entries()).map(([groupKey, groupListings]) => {
        const offer = groupListings[0]!;
        return <section key={groupKey} className="space-y-3">
          <div><p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{offer.merchantName}</p>
            <h3 className="mt-1 text-lg font-semibold">{formatReward(offer)} · {offer.offerTitle}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{groupListings.length} seller {groupListings.length === 1 ? "listing" : "listings"} for this credit card offer</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{groupListings.map((listing) => <ListingCard key={listing.listingId} listing={listing} />)}</div>
        </section>;
      })}
    </div> : <EmptyState icon={Search} title="No verified listings match" description="Try widening your filters or searching for another merchant." />}

    {totalPages > 1 ? <nav aria-label="Marketplace result pages" className="flex items-center justify-center gap-3">
      {filters.page > 1 ? <Link href={pageHref(rawParams, filters.page - 1)} className={buttonVariants({ variant: "outline" })}><ChevronLeft aria-hidden="true" /> Previous</Link> : null}
      <span className="text-sm text-muted-foreground">Page {filters.page} of {totalPages}</span>
      {filters.page < totalPages ? <Link href={pageHref(rawParams, filters.page + 1)} className={buttonVariants({ variant: "outline" })}>Next <ChevronRight aria-hidden="true" /></Link> : null}
    </nav> : null}
  </div>;
}
