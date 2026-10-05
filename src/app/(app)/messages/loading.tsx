import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return <div className="space-y-8" role="status" aria-label="Loading messages">
    <div className="space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-10 w-56" /><Skeleton className="h-5 w-full max-w-xl" /></div>
    <div className="space-y-3">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24 rounded-3xl" />)}</div>
    <span className="sr-only">Loading…</span>
  </div>;
}
