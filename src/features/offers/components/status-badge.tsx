import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Pending verification",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  NEEDS_REVIEW: "Needs review",
  EXPIRED: "Expired",
  PENDING_VERIFICATION: "Pending verification",
  ACTIVE: "Active",
  PAUSED: "Paused",
  REMOVED: "Removed",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
        status === "VERIFIED" || status === "ACTIVE"
          ? "bg-secondary text-primary"
          : status === "REJECTED" || status === "EXPIRED"
            ? "bg-red-50 text-red-700"
            : status === "PENDING" || status === "PENDING_VERIFICATION"
              ? "bg-amber-50 text-amber-800"
              : "bg-muted text-muted-foreground",
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
