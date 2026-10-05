import { Skeleton } from "@/components/ui/skeleton";

export default function ReputationLoading() {
  return <div className="mx-auto max-w-3xl space-y-6" role="status" aria-label="Loading profile and reviews">
    <Skeleton className="h-10 w-36" />
    <section className="rounded-3xl border border-border bg-card p-6"><Skeleton className="size-20" /><Skeleton className="mt-4 h-8 w-48" /><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24" />)}</div></section>
    <section className="rounded-3xl border border-border bg-card p-6"><Skeleton className="h-6 w-32" /><Skeleton className="mt-5 h-28 w-full" /></section>
    <span className="sr-only">Loading…</span>
  </div>;
}
