import Link from "next/link";

import { Button } from "@/components/ui/button";

export function HistoryPagination({
  label,
  page,
  pageSize,
  total,
  hrefFor,
}: {
  label: string;
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return <nav aria-label={`${label} pages`} className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
    <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
      <Link href={hrefFor(page - 1)}>Previous</Link>
    </Button>
    <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
    <Button asChild variant="outline" size="sm" className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
      <Link href={hrefFor(page + 1)}>Next</Link>
    </Button>
  </nav>;
}

