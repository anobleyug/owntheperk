import { Ban, CheckCircle2, Eye, Flag, Trash2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { moderateReportAction } from "../actions";
import type { AdminReportDTO } from "../types";

function Action({ reportId, operation, label, icon: Icon, disabled = false }: {
  reportId: string;
  operation: "REVIEWING" | "RESOLVED" | "DISMISSED" | "SUSPEND_USER" | "REMOVE_LISTING";
  label: string;
  icon: typeof Eye;
  disabled?: boolean;
}) {
  const action = moderateReportAction.bind(null, reportId, operation);
  return <form action={action}><Button type="submit" variant="outline" size="sm" disabled={disabled}><Icon aria-hidden="true" /> {label}</Button></form>;
}

export function ReportCard({ report }: { report: AdminReportDTO }) {
  return <article className="rounded-3xl border border-border bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-primary uppercase"><Flag aria-hidden="true" className="size-3.5" /> {report.reason.replaceAll("_", " ")}</p><h2 className="mt-2 text-lg font-semibold">Report against {report.reportedUsername}</h2><p className="mt-1 text-xs text-muted-foreground">Submitted by {report.reporterUsername} · {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(report.createdAt))}</p></div>
      <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">{report.status.toLowerCase()}</span>
    </div>
    <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-muted/60 p-4 text-sm leading-6">{report.description}</p>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-muted-foreground">Safe context</dt><dd className="mt-1 font-medium">{report.contextMerchantName ? `${report.contextMerchantName} · ${report.contextOfferTitle ?? "Listing"}` : "Conversation context only"}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Reported account</dt><dd className="mt-1 font-medium">{report.reportedAccountStatus.toLowerCase()}</dd></div>
    </dl>
    <div className="mt-5 flex flex-wrap gap-2">
      <Action reportId={report.id} operation="REVIEWING" label="Mark reviewing" icon={Eye} />
      <Action reportId={report.id} operation="RESOLVED" label="Resolve" icon={CheckCircle2} />
      <Action reportId={report.id} operation="DISMISSED" label="Dismiss" icon={XCircle} />
      <Action reportId={report.id} operation="SUSPEND_USER" label="Suspend user" icon={Ban} disabled={report.reportedAccountStatus !== "ACTIVE"} />
      <Action reportId={report.id} operation="REMOVE_LISTING" label="Remove listing" icon={Trash2} disabled={!report.offerListingId} />
    </div>
  </article>;
}
