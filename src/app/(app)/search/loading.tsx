import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return <div className="space-y-8" role="status" aria-label="Loading marketplace search">
    <div className="space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-10 w-full max-w-md" /><Skeleton className="h-5 w-full max-w-xl" /></div>
    <Skeleton className="h-72 w-full rounded-3xl" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-72 rounded-3xl" />)}</div>
    <span className="sr-only">Loading…</span>
  </div>;
}
