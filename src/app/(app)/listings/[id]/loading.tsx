import { Skeleton } from "@/components/ui/skeleton";

export default function ListingLoading() {
  return <div className="mx-auto max-w-4xl space-y-6" role="status" aria-label="Loading listing">
    <Skeleton className="h-10 w-44" />
    <section className="rounded-3xl border border-border bg-card p-6"><Skeleton className="h-4 w-24" /><Skeleton className="mt-4 h-10 w-56" /><Skeleton className="mt-4 h-5 w-full max-w-xl" /><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24" />)}</div></section>
    <Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-28 rounded-3xl" />
    <span className="sr-only">Loading…</span>
  </div>;
}
