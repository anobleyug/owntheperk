"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMarketplaceOffers, fetchMerchantSummaries, marketplaceSearchParams } from "../client";
import type { MarketplaceFilters } from "../types";
import { GroupedOfferCard } from "./grouped-offer-card";

const inputClass = "min-h-11 w-full rounded-2xl border border-input bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

function ResultsSkeleton() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading marketplace listings">
    {[0, 1, 2].map((item) => <div key={item} className="rounded-3xl border border-border bg-card p-5">
      <Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-6 w-3/4" />
      <div className="mt-6 grid grid-cols-2 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      <Skeleton className="mt-5 h-11 w-full" />
    </div>)}
  </div>;
}

export function MarketplaceSearch({ filters }: { filters: MarketplaceFilters }) {
  const router = useRouter();
  const filterKey = marketplaceSearchParams(filters).toString();
  const offersQuery = useQuery({
    queryKey: ["public-marketplace-offers", filterKey],
    queryFn: () => fetchMarketplaceOffers(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const merchantsQuery = useQuery({
    queryKey: ["public-marketplace-merchants"],
    queryFn: fetchMerchantSummaries,
    staleTime: 60_000,
  });

  const result = offersQuery.data;
  const offers = result?.offers ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (result?.pageSize ?? 12)));

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const values = new FormData(event.currentTarget);
    for (const [key, value] of values.entries()) if (typeof value === "string" && value) params.set(key, value);
    params.delete("page");
    const query = params.get("q")?.trim();
    if (query) {
      void fetch("/api/marketplace/search-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
    }
    router.push(params.size ? `/search?${params}` : "/search");
  }

  function pageHref(page: number) {
    const params = marketplaceSearchParams(filters);
    params.set("page", String(page));
    return `/search?${params}`;
  }

  return <div className="space-y-8">
    <PageHeader eyebrow="Verified marketplace" title="Find a shared card offer" description="Compare verified offer groups, then choose among eligible anonymous listings." />

    <form key={filterKey} onSubmit={submitFilters} className="rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-2"><SlidersHorizontal aria-hidden="true" className="size-5 text-primary" /><h2 className="font-semibold">Search and filters</h2></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Merchant
          <input name="q" type="search" defaultValue={filters.q} list="marketplace-merchants" placeholder="Adobe, Nike, Marriott…" className={inputClass} />
          <datalist id="marketplace-merchants">{merchantsQuery.data?.map((merchant) => <option key={merchant.id} value={merchant.name} />)}</datalist>
        </label>
        <label className="space-y-1.5 text-xs font-semibold">Issuer (public offers only)
          <input name="issuer" defaultValue={filters.issuer} placeholder="Amex" className={inputClass} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">Card product (public only)
          <input name="cardProduct" defaultValue={filters.cardProduct} placeholder="Platinum" className={inputClass} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">Maximum offer spend
          <input name="maxRequiredSpend" type="number" min="0" step="0.01" defaultValue={filters.maxRequiredSpend} className={inputClass} />
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
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="submit" className={buttonVariants()}><Search aria-hidden="true" /> Search marketplace</button>
        <Link href="/search" className={buttonVariants({ variant: "outline" })}>Clear filters</Link>
        {offersQuery.isFetching && result ? <span role="status" className="text-xs text-muted-foreground">Refreshing results…</span> : null}
      </div>
    </form>

    {offersQuery.isPending ? <ResultsSkeleton /> : offersQuery.isError ?
      <EmptyState icon={Search} title="Marketplace unavailable" description="We could not refresh the marketplace. Please try again." /> : <>
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">{total} shared {total === 1 ? "offer" : "offers"}</h2><p className="mt-1 text-sm text-muted-foreground">Each result combines publicly eligible listings for one canonical offer.</p></div></div>
        {offers.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => <GroupedOfferCard key={offer.offerId} offer={offer} />)}
        </div> : <EmptyState icon={Search} title="No verified offers match" description="Try widening your filters or searching for another merchant." />}

        {totalPages > 1 ? <nav aria-label="Marketplace result pages" className="flex items-center justify-center gap-3">
          {filters.page > 1 ? <Link href={pageHref(filters.page - 1)} className={buttonVariants({ variant: "outline" })}><ChevronLeft aria-hidden="true" /> Previous</Link> : null}
          <span className="text-sm text-muted-foreground">Page {filters.page} of {totalPages}</span>
          {filters.page < totalPages ? <Link href={pageHref(filters.page + 1)} className={buttonVariants({ variant: "outline" })}>Next <ChevronRight aria-hidden="true" /></Link> : null}
        </nav> : null}
      </>}
  </div>;
}
