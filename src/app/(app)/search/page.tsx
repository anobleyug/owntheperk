import type { Metadata } from "next";

import { MarketplaceSearch } from "@/features/marketplace/components/marketplace-search";
import { parseMarketplaceFilters } from "@/features/marketplace/schema";

export const metadata: Metadata = { title: "Search marketplace" };

export default async function SearchPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseMarketplaceFilters(await searchParams);
  return <MarketplaceSearch filters={filters} />;
}
