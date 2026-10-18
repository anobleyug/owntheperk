import { CheckCircle2, CircleX, ExternalLink, MessageSquareWarning } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { feedbackCategoryLabels } from "@/features/feedback/types";
import { updateFeedbackStatusAction } from "../actions";
import type { AdminFeedbackDTO } from "../types";

function StatusAction({ submissionId, status, label, icon: Icon, disabled }: {
  submissionId: string;
  status: "REVIEWED" | "CLOSED";
  label: string;
  icon: typeof CheckCircle2;
  disabled: boolean;
}) {
  const action = updateFeedbackStatusAction.bind(null, submissionId, status);
  return <form action={action} className="min-[420px]:w-auto">
    <Button type="submit" variant="outline" size="sm" className="w-full min-[420px]:w-auto" disabled={disabled}>
      <Icon aria-hidden="true" /> {label}
    </Button>
  </form>;
}

export function FeedbackCard({ submission }: { submission: AdminFeedbackDTO }) {
  const submittedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(submission.createdAt));

  return <article className="rounded-3xl border border-border bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-primary uppercase">
          <MessageSquareWarning aria-hidden="true" className="size-3.5" />
          {submission.type === "BUG" ? "Bug report" : "Feedback"}
          {submission.category ? ` · ${feedbackCategoryLabels[submission.category]}` : ""}
        </p>
        <h2 className="mt-2 text-lg font-semibold break-words">{submission.subject}</h2>
        <p className="mt-1 text-xs text-muted-foreground">Submitted {submittedDate}</p>
      </div>
      <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">{submission.status.toLowerCase()}</span>
    </div>

    <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-muted/60 p-4 text-sm leading-6 break-words">{submission.message}</p>

    <dl className="mt-4 grid gap-4 text-sm lg:grid-cols-2">
      <div>
        <dt className="text-xs text-muted-foreground">Account reference</dt>
        <dd className="mt-1 font-medium">{submission.username}</dd>
        <dd className="mt-1 font-mono text-xs text-muted-foreground break-all">{submission.userId}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">App page</dt>
        <dd className="mt-1 break-all">
          {submission.pageUrl ? <Link href={submission.pageUrl} className="inline-flex min-h-8 items-center gap-1 font-medium text-primary hover:underline">{submission.pageUrl}<ExternalLink aria-hidden="true" className="size-3.5" /></Link> : "Not captured"}
        </dd>
      </div>
      <div className="lg:col-span-2">
        <dt className="text-xs text-muted-foreground">Browser metadata</dt>
        <dd className="mt-1 text-xs leading-5 break-words text-muted-foreground">{submission.userAgent ?? "Not captured"}</dd>
      </div>
    </dl>

    <div className="mt-5 grid gap-2 min-[420px]:flex min-[420px]:flex-wrap">
      <StatusAction submissionId={submission.id} status="REVIEWED" label="Mark Reviewed" icon={CheckCircle2} disabled={submission.status !== "NEW"} />
      <StatusAction submissionId={submission.id} status="CLOSED" label="Close" icon={CircleX} disabled={submission.status === "CLOSED"} />
    </div>
  </article>;
}

